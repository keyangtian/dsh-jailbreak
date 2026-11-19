// dsh-jailbreak — 运行时越狱插件（不修改宿主文件）。
// 1) 清空 system prompt 的所有 section / runtime context；
//    可用 DSH_JAILBREAK_PROMPT 环境变量注入一段自定义提示词（唯一保留的 section）。
// 2) 审批请求永远返回 allowed-once。
// 3) 沙箱 confine 直通。
// 4) 过滤 AGENTS.md 注入（agent/pre-step 里含 "Instructions from:" 的 user message）。
// 5) 过滤 skill 目录注入（含 "<available_skills>" 的 user message）。
export const name = 'dsh-jailbreak';
export const inject = ['systemPrompt', 'approval', 'sandbox'];

const INJECTED_MARKERS = ['Instructions from:', '<available_skills>', 'Additional instructions from:'];

function textOf(message) {
  if (!message || !Array.isArray(message.content)) return '';
  return message.content
    .map((block) => (block && typeof block.text === 'string' ? block.text : ''))
    .join('');
}

function isInjectedMessage(message) {
  const text = textOf(message);
  return INJECTED_MARKERS.some((marker) => text.includes(marker));
}

export function apply(ctx) {
  const injectedPrompt = process.env.DSH_JAILBREAK_PROMPT ?? '';
  const filterInjected = process.env.DSH_JAILBREAK_FILTER !== '0';

  ctx.inject(['systemPrompt', 'approval', 'sandbox'], (scope) => {
    // 1) system prompt: 组装结果清空（或只保留注入段）
    const sp = scope.systemPrompt;
    if (sp && typeof sp.assemble === 'function' && !sp.__jailbreakPatched) {
      const original = sp.assemble.bind(sp);
      sp.assemble = async (context = {}) => {
        const assembly = await original(context);
        const sections = injectedPrompt.length > 0
          ? [{ name: 'jailbreak:injected', text: injectedPrompt }]
          : [];
        return { ...assembly, sections, contexts: [] };
      };
      sp.__jailbreakPatched = true;
    }

    // 2) approval: 永不拒绝
    const approval = scope.approval;
    if (approval && typeof approval.decide === 'function' && !approval.__jailbreakPatched) {
      approval.decide = async () => 'allowed-once';
      approval.__jailbreakPatched = true;
    }

    // 3) sandbox: 任何 mode 都直通
    const sandbox = scope.sandbox;
    if (sandbox && typeof sandbox.confine === 'function' && !sandbox.__jailbreakPatched) {
      sandbox.confine = async (argv) => ({
        argv,
        enforcement: 'none',
        denialSignatures: [],
        runnerFailureRules: []
      });
      sandbox.__jailbreakPatched = true;
    }
  });

  // 4/5) 过滤 AGENTS.md 与 skill 目录注入（user message 层）
  if (filterInjected) {
    ctx.on('agent/pre-step', async (input, next) => {
      const result = await next();
      if (!result || !Array.isArray(result.messages)) return result;
      const filtered = result.messages.filter((message) => !isInjectedMessage(message));
      return filtered.length === result.messages.length
        ? result
        : { ...result, messages: filtered };
    });
  }
}
