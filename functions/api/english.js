// POST /api/english: English conversation tutor backed by the Gemini Interactions API.
// Runs as a Cloudflare Pages Function, so the Gemini key (env GEMINI_API_KEY) never reaches the browser.
//
// Only the admin account may use it. Instead of keeping a second copy of the admin's identity here,
// we ask Firestore: listing vutru_chitieu/ is allowed by firestore.rules for the admin alone, and
// Firestore itself verifies the caller's Firebase ID token.
//
// Request:  Authorization: Bearer <Firebase ID token>
//           {scenario, level, messages: [{role: 'user' | 'tutor', text}]}
//           An empty messages list asks the tutor to open the conversation.
// Response: {corrected, is_correct, mistakes[], better, reply, reply_vi, vocabulary[]}

const FIREBASE_PROJECT = 'python-chat-7e32a';
const DEFAULT_MODEL = 'gemini-3.8-flash';
const API_REVISION = '2026-05-20';
const MAX_TURNS = 24;
const MAX_CHARS = 1200;

const SCENARIOS = {
  free: 'Free conversation about daily life, hobbies, work and plans. You are a friendly conversation partner.',
  restaurant: 'At a restaurant. You are the waiter; the learner is a customer ordering food and drinks.',
  interview: 'A job interview. You are the interviewer; the learner is the candidate.',
  travel: 'Travel: airport check-in, hotel reception and asking for directions. You play the staff or a local.',
  shopping: 'Shopping in a clothes or electronics store. You are the shop assistant.',
  office: 'Office life: meetings, emails, small talk with colleagues. You are a colleague.',
  doctor: 'A visit to the doctor. You are the doctor; the learner describes their symptoms.',
};
const LEVELS = {
  beginner: 'Beginner (A1-A2): use short, simple sentences and very common words.',
  intermediate: 'Intermediate (B1-B2): use everyday natural English with some useful phrases.',
  advanced: 'Advanced (C1): use natural, idiomatic English as a native speaker would.',
};
const MISTAKE_TYPES = ['grammar', 'vocabulary', 'spelling', 'word_order', 'naturalness', 'translation'];

const SCHEMA = {
  type: 'object',
  properties: {
    corrected: {type: 'string', description: "The learner's newest message rewritten in correct English. Empty string when opening the conversation."},
    is_correct: {type: 'boolean', description: 'True when the newest message has no real mistakes.'},
    mistakes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: {type: 'string', description: 'The wrong words, copied from the learner message.'},
          correction: {type: 'string', description: 'The corrected words.'},
          type: {type: 'string', enum: MISTAKE_TYPES},
          explanation_en: {type: 'string', description: 'Short explanation in simple English.'},
          explanation_vi: {type: 'string', description: 'The same explanation in natural Vietnamese.'},
        },
        required: ['original', 'correction', 'type', 'explanation_en', 'explanation_vi'],
      },
    },
    better: {type: 'string', description: 'A more natural way a native speaker would say it, or empty string if the corrected sentence is already natural.'},
    reply: {type: 'string', description: 'Your next line in the conversation, in English.'},
    reply_vi: {type: 'string', description: 'Vietnamese translation of reply.'},
    vocabulary: {
      type: 'array',
      description: 'Zero to three useful words or phrases from your reply.',
      items: {
        type: 'object',
        properties: {word: {type: 'string'}, meaning_vi: {type: 'string'}},
        required: ['word', 'meaning_vi'],
      },
    },
  },
  required: ['corrected', 'is_correct', 'mistakes', 'better', 'reply', 'reply_vi', 'vocabulary'],
};

function systemInstruction(scenario, level) {
  return [
    'You are a warm, patient English conversation partner and tutor for a Vietnamese learner.',
    `Scenario: ${SCENARIOS[scenario]}`,
    `Learner level: ${LEVELS[level]}`,
    '',
    'Every turn you get the conversation so far and the learner\'s newest message. Do two things.',
    '',
    '1. Check the newest learner message for grammar, vocabulary, spelling, word order and naturalness.',
    '   - List each real mistake once, with the exact wrong words, the fix, and a short explanation in simple English and in natural Vietnamese.',
    '   - Explain the rule behind the mistake (for example which tense and why), not just the fix.',
    '   - Ignore a missing final full stop and the capitalisation of the first word; never invent mistakes. If the message is fine, set is_correct to true and leave mistakes empty.',
    '   - If the learner writes in Vietnamese or mixes Vietnamese and English, they want to know how to say it: put the natural English version in corrected, add one "translation" item per key phrase explaining it, and set is_correct to false.',
    '   - Use "better" only for a clearly more natural phrasing; otherwise leave it empty.',
    '',
    '2. Continue the conversation in your role: reply in English at the learner\'s level, one to three sentences, usually ending with a question so the learner keeps talking. Respond to what they meant even if it had mistakes. Give a natural Vietnamese translation in reply_vi.',
    '',
    'When the newest message is exactly [START], open the conversation: greet the learner and set the scene in your role. Leave corrected and better empty, mistakes empty and is_correct true.',
  ].join('\n');
}

function transcript(messages) {
  const history = messages.slice(0, -1).map(m => `${m.role === 'tutor' ? 'Tutor' : 'Learner'}: ${m.text}`).join('\n');
  const last = messages.length ? messages[messages.length - 1].text : '[START]';
  return (history ? `Conversation so far:\n${history}\n\n` : 'This is the start of the conversation.\n\n') +
    `Newest learner message (check this one):\n${last}`;
}

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'},
});
const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function isAdmin(token) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/vutru_chitieu?pageSize=1`;
  const res = await fetch(url, {headers: {authorization: `Bearer ${token}`}});
  if (res.ok) return 'yes';
  return res.status === 401 ? 'expired' : 'no';
}

export async function onRequestPost({request, env}) {
  if (!env.GEMINI_API_KEY) return json(500, {error: 'not_configured', message: 'Máy chủ chưa có GEMINI_API_KEY. Thêm biến này trong Cloudflare Pages → Settings → Variables and Secrets.'});

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return json(401, {error: 'unauthenticated', message: 'Cần đăng nhập.'});
  let admin;
  try { admin = await isAdmin(token); } catch (e) { return json(502, {error: 'auth_check_failed', message: 'Không kiểm tra được quyền truy cập. Thử lại sau.'}); }
  if (admin === 'expired') return json(401, {error: 'unauthenticated', message: 'Phiên đăng nhập đã hết hạn. Tải lại trang rồi thử lại.'});
  if (admin !== 'yes') return json(403, {error: 'forbidden', message: 'Chức năng này chỉ dành cho quản trị viên.'});

  let body;
  try { body = await request.json(); } catch (e) { return json(400, {error: 'bad_request', message: 'Dữ liệu gửi lên không hợp lệ.'}); }
  const scenario = Object.hasOwn(SCENARIOS, body.scenario) ? body.scenario : 'free';
  const level = Object.hasOwn(LEVELS, body.level) ? body.level : 'intermediate';
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'tutor') && str(m.text))
    .slice(-MAX_TURNS)
    .map(m => ({role: m.role, text: str(m.text, MAX_CHARS)}));
  if (messages.length && messages[messages.length - 1].role !== 'user') return json(400, {error: 'bad_request', message: 'Tin nhắn cuối phải là của người học.'});

  let res;
  try {
    res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY, 'Api-Revision': API_REVISION},
      body: JSON.stringify({
        model: env.GEMINI_MODEL || DEFAULT_MODEL,
        store: false,
        system_instruction: systemInstruction(scenario, level),
        input: transcript(messages),
        response_format: {type: 'text', mime_type: 'application/json', schema: SCHEMA},
        generation_config: {thinking_level: 'low', max_output_tokens: 4096},
      }),
    });
  } catch (e) {
    return json(502, {error: 'upstream_unreachable', message: 'Không kết nối được Gemini. Thử lại sau.'});
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = (data && data.error && data.error.message) || '';
    console.error('gemini', res.status, detail);
    if (res.status === 429) return json(429, {error: 'quota', message: 'Đã hết hạn mức miễn phí của Gemini lúc này. Đợi ít phút rồi thử lại.'});
    if (res.status === 400 && /api key/i.test(detail)) return json(502, {error: 'bad_key', message: 'GEMINI_API_KEY không hợp lệ.'});
    if (res.status === 403) return json(502, {error: 'bad_key', message: 'GEMINI_API_KEY không có quyền dùng mô hình này.'});
    return json(502, {error: 'upstream', message: `Gemini báo lỗi (${res.status})${detail ? ': ' + detail.slice(0, 200) : ''}.`});
  }
  if (!data || (data.status && data.status !== 'completed')) {
    console.error('gemini status', data && data.status, data && data.errors);
    return json(502, {error: 'incomplete', message: 'Gemini chưa trả lời xong. Thử gửi lại.'});
  }

  // The answer is the text of the last model_output step.
  const outputs = (data.steps || []).filter(s => s && s.type === 'model_output');
  const text = outputs.length ? (outputs[outputs.length - 1].content || []).filter(c => c && c.type === 'text').map(c => c.text).join('') : '';
  let out;
  try { out = JSON.parse(text); } catch (e) {
    console.error('gemini non-json', text.slice(0, 300));
    return json(502, {error: 'bad_output', message: 'Gemini trả về dữ liệu không đúng định dạng. Thử gửi lại.'});
  }
  if (!str(out.reply)) return json(502, {error: 'bad_output', message: 'Gemini không trả lời. Thử gửi lại.'});

  const mistakes = (Array.isArray(out.mistakes) ? out.mistakes : []).slice(0, 12).map(m => ({
    original: str(m && m.original, 300), correction: str(m && m.correction, 300),
    type: MISTAKE_TYPES.includes(m && m.type) ? m.type : 'grammar',
    explanation_en: str(m && m.explanation_en, 800), explanation_vi: str(m && m.explanation_vi, 800),
  })).filter(m => m.explanation_en || m.explanation_vi);
  return json(200, {
    corrected: str(out.corrected, MAX_CHARS * 2),
    is_correct: messages.length ? out.is_correct === true && !mistakes.length : true,
    mistakes,
    better: str(out.better, MAX_CHARS * 2),
    reply: str(out.reply, 3000),
    reply_vi: str(out.reply_vi, 3000),
    vocabulary: (Array.isArray(out.vocabulary) ? out.vocabulary : []).slice(0, 3)
      .map(v => ({word: str(v && v.word, 80), meaning_vi: str(v && v.meaning_vi, 200)})).filter(v => v.word),
  });
}
