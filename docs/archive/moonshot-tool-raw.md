> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 工具调用

学会使用工具是智能的一个重要特征，在 Kimi 大模型中我们同样如此。Tool Use 或者 Function Calling 是 Kimi 大模型的一个重要功能，在调用 API 使用模型服务时，您可以在 Messages 中描述工具或函数，并让 Kimi 大模型智能地选择输出一个包含调用一个或多个函数所需的参数的 JSON 对象，实现让 Kimi 大模型链接使用外部工具的目的。

下面是一个简单的工具调用的例子：

```json theme={null}
{
  "model": "kimi-k2.6",
  "messages": [
    {
      "role": "user",
      "content": "编程判断 3214567 是否是素数。"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "CodeRunner",
        "description": "代码执行器，支持运行 python 和 javascript 代码",
        "parameters": {
          "properties": {
            "language": {
              "type": "string",
              "enum": ["python", "javascript"]
            },
            "code": {
              "type": "string",
              "description": "代码写在这里"
            }
          },
          "type": "object"
        }
      }
    }
  ]
}
```

<Frame>
  <img src="https://mintcdn.com/moonshotcn/3bxMseHtiQ3oOhqL/assets/images/tooluse_whiteboard_example.png?fit=max&auto=format&n=3bxMseHtiQ3oOhqL&q=85&s=198f50ed66d4c6d9bd84ca4b4b745031" alt="上面例子的示意图" width="835" height="644" data-path="assets/images/tooluse_whiteboard_example.png" />
</Frame>

其中在 tools 字段，我们可以增加一组可选的工具列表。

每个工具列表必须包括一个类型，在 function 结构体中我们需要包括 name（它的需要遵守这样的正则表达式作为规范: ^\[a-zA-Z\_]\[a-zA-Z0-9-\_]{2,63}\$），这个名字如果是一个容易理解的英文可能会更加被模型所接受。以及一段 description 或者 enum，其中 description 部分介绍它能做什么功能，方便模型来判断和选择。
function 结构体中必须要有个 parameters 字段，parameters 的 root 必须是一个 object，内容是一个 json schema 的子集（详见 [MFJS 规范](https://github.com/MoonshotAI/walle/blob/main/docs/mfjs-spec.zh.md)）。

此外，每个 function 支持 `strict` 参数（boolean 类型，可选），用于控制是否严格按 `parameters` 定义的 JSON Schema 约束工具调用参数的输出：

* **`true`（默认，不传等价于 `true`）**：系统会严格按照 `parameters` schema 约束输出，schema 需符合 MFJS 规范
* **`false`（需显式传入）**：仅保证输出为合法 JSON 对象，不强制约束内部结构

tools 的 function 个数目前不得超过 128 个。

如果您在使用 JSON Schema 时遇到校验问题，欢迎到 [walle GitHub Issues](https://github.com/MoonshotAI/walle/issues) 提交反馈。

和别的 API 一样，我们可以通过 Chat API 调用它。

<CodeGroup>
  ```python Python expandable theme={null}
  from openai import OpenAI

  client = OpenAI(
      api_key = "$MOONSHOT_API_KEY",
      base_url = "https://api.moonshot.cn/v1",
  )

  completion = client.chat.completions.create(
      model = "kimi-k2.6",
      messages = [
          {"role": "system", "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"},
          {"role": "user", "content": "编程判断 3214567 是否是素数。"}
      ],
      tools = [{
          "type": "function",
          "function": {
              "name": "CodeRunner",
              "description": "代码执行器，支持运行 python 和 javascript 代码",
              "parameters": {
                  "properties": {
                      "language": {
                          "type": "string",
                          "enum": ["python", "javascript"]
                      },
                      "code": {
                          "type": "string",
                          "description": "代码写在这里"
                      }
                  },
              "type": "object"
              }
          }
      }]
  )

  print(completion.choices[0].message)
  ```

  ```bash cURL expandable theme={null}
  curl https://api.moonshot.cn/v1/chat/completions \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $MOONSHOT_API_KEY" \
      -d '{
          "model": "kimi-k2.6",
          "messages": [
              {"role": "system", "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"},
              {"role": "user", "content": "编程判断 3214567 是否是素数。"}
          ],
          "tools": [{
              "type": "function",
              "function": {
                  "name": "CodeRunner",
                  "description": "代码执行器，支持运行 python 和 javascript 代码",
                  "parameters": {
                      "properties": {
                          "language": {
                              "type": "string",
                              "enum": ["python", "javascript"]
                          },
                          "code": {
                              "type": "string",
                              "description": "代码写在这里"
                          }
                      },
                  "type": "object"
                  }
              }
          }]
     }'
  ```

  ```javascript Node.js expandable theme={null}
  const OpenAI = require("openai");

  const client = new OpenAI({
      apiKey: "$MOONSHOT_API_KEY",
      baseURL: "https://api.moonshot.cn/v1",
  });

  async function main() {
      const completion = await client.chat.completions.create({
          model: "kimi-k2.6",
          messages: [
              {"role": "system", "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"},
              {"role": "user", "content": "编程判断 3214567 是否是素数。"}
          ],
          tools: [{
              "type": "function",
              "function": {
                  "name": "CodeRunner",
                  "description": "代码执行器，支持运行 python 和 javascript 代码",
                  "parameters": {
                      "properties": {
                          "language": {
                              "type": "string",
                              "enum": ["python", "javascript"]
                          },
                          "code": {
                              "type": "string",
                              "description": "代码写在这里"
                          }
                      },
                  "type": "object"
                  }
              }
          }]
      });
      console.log(completion.choices[0].message);
  }

  main();
  ```
</CodeGroup>

### 工具配置

你也可以使用一些 Agent 平台例如 [Coze](https://coze.cn/)、[Bisheng](https://github.com/dataelement/bisheng)、[Dify](https://github.com/langgenius/dify/) 和 [LangChain](https://github.com/langchain-ai/langchain) 等框架来创建和管理这些工具，并配合 Kimi 大模型设计更加复杂的工作流。
解释