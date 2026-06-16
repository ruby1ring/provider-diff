window.NOCTUA_CHANNEL_CATALOG = (() => {
  const protocolColumns = [
    { id: "chat_completions", label: "OpenAI Chat Completions API" },
    { id: "anthropic_messages", label: "Anthropic Messages API" },
    { id: "responses_api", label: "OpenAI Responses API" }
  ];

  const evalModelIds = [
    "deepseek-v4-flash",
    "deepseek-v4-pro",
    "kimi-k2.7-coder",
    "kimi-k2.6",
    "glm-5.1",
    "glm-5",
    "MiniMax-M3"
  ];

  function protocolsFor(modelId, { anthropicMessages = false } = {}) {
    const deepseek = modelId.startsWith("deepseek");
    const minimax = modelId.startsWith("MiniMax");
    return {
      chat_completions: true,
      anthropic_messages: anthropicMessages || deepseek || minimax,
      responses_api: false
    };
  }

  function protocolsAllSupported() {
    return {
      chat_completions: true,
      anthropic_messages: true,
      responses_api: true
    };
  }

  function modelsForPlatform(options = {}) {
    const { anthropicMessages = false, availability = null } = options;
    return evalModelIds.map((name) => {
      const available = availability ? Boolean(availability[name]) : true;
      return {
        name,
        protocols: available
          ? protocolsFor(name, { anthropicMessages })
          : { chat_completions: false, anthropic_messages: false, responses_api: false }
      };
    });
  }

  return {
    protocolColumns,
    evalModelIds,
    scopeNote: "当前测评模型范围：DeepSeek、GLM、KIMI、MiniMax。",
    tabCopy: {
      oem: "模型原厂开放平台直接部署的模型，按模型维度列出对三种文本协议的支持情况。",
      deploy: "第三方 API 平台托管部署的模型，统一按 deepseek-v4-flash、deepseek-v4-pro、kimi-k2.7-coder、kimi-k2.6、glm-5.1、glm-5、MiniMax-M3 列出。",
      route: "仅做路由转发的 API 平台，同样按上述 7 个测评模型列出协议支持情况。"
    },
    oemPlatforms: [
      {
        id: "deepseek",
        name: "DeepSeek 开放平台",
        logo: "design-system/assets/logos/deepseek.ico",
        channel_id: "deepseek",
        models: [
          { name: "deepseek-v4-flash", protocols: protocolsFor("deepseek-v4-flash", { anthropicMessages: true }) },
          { name: "deepseek-v4-pro", protocols: protocolsFor("deepseek-v4-pro", { anthropicMessages: true }) }
        ]
      },
      {
        id: "moonshot",
        name: "Moonshot 开放平台",
        logo: "design-system/assets/logos/moonshot.ico",
        models: [
          { name: "kimi-k2.7-coder", protocols: protocolsFor("kimi-k2.7-coder") },
          { name: "kimi-k2.6", protocols: protocolsFor("kimi-k2.6") }
        ]
      },
      {
        id: "zhipu",
        name: "智谱开放平台",
        logo: "design-system/assets/logos/zhipu.svg",
        models: [
          { name: "glm-5.1", protocols: protocolsFor("glm-5.1") },
          { name: "glm-5", protocols: protocolsFor("glm-5") }
        ]
      },
      {
        id: "minimax",
        name: "MiniMax 开放平台",
        logo: "design-system/assets/logos/minimax.ico",
        channel_id: "minimax",
        models: [
          { name: "MiniMax-M3", protocols: protocolsFor("MiniMax-M3", { anthropicMessages: true }) }
        ]
      }
    ],
    deployPlatforms: [
      {
        id: "aliyun-cn",
        name: "阿里云百炼（中国-华北 2）",
        logo: "design-system/assets/logos/aliyun.svg",
        focus: true,
        channel_id: "aliyun",
        models: modelsForPlatform({ anthropicMessages: true })
      },
      {
        id: "aliyun-us",
        name: "阿里云百炼（美国-弗吉尼亚）",
        logo: "design-system/assets/logos/aliyun.svg",
        focus: true,
        channel_id: "aliyun",
        models: modelsForPlatform({ anthropicMessages: true })
      },
      {
        id: "siliconflow-cn",
        name: "SiliconFlow CN",
        logo: "design-system/assets/logos/siliconflow-mark.svg",
        focus: true,
        channel_id: "siliconflow",
        models: modelsForPlatform({ anthropicMessages: false })
      },
      {
        id: "siliconflow-com",
        name: "SiliconFlow COM",
        logo: "design-system/assets/logos/siliconflow-mark.svg",
        focus: true,
        channel_id: "siliconflow",
        models: modelsForPlatform({ anthropicMessages: false })
      }
    ],
    routePlatforms: [
      {
        id: "openrouter",
        name: "OpenRouter",
        logo: "design-system/assets/logos/openrouter.svg",
        focus: true,
        channel_id: "openrouter",
        models: modelsForPlatform({ anthropicMessages: true })
      },
      {
        id: "sf-router-cn",
        name: "SF Router CN",
        logo: "design-system/assets/logos/siliconflow-mark.svg",
        focus: true,
        channel_id: "silinex_china",
        models: evalModelIds.map((name) => ({ name, protocols: protocolsAllSupported() }))
      },
      {
        id: "sf-router-com",
        name: "SF Router COM",
        logo: "design-system/assets/logos/siliconflow-mark.svg",
        focus: true,
        channel_id: "silinex_overseas",
        models: evalModelIds.map((name) => ({ name, protocols: protocolsAllSupported() }))
      }
    ]
  };
})();
