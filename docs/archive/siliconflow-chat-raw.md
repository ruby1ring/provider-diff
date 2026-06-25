> ## Documentation Index
> 
> Fetch the complete documentation index at: https://docs.siliconflow.cn/llms.txt
> Use this file to discover all available pages before exploring further.

# 创建对话请求（OpenAI）

> Creates a model response for the given chat conversation.

## OpenAPI

```yaml post /chat/completions
openapi: 3.0.0
info:
  title: SiliconFlow API
  description: The SiliconFlow REST API
  version: 1.0.0
  contact:
    name: SiliconFlow Support
    url: https://www.siliconflow.cn/
  license:
    name: MIT
    url: https://github.com/siliconflow/siliconcloud/blob/main/LICENSE
servers:
  - url: https://api.siliconflow.cn/v1
security:
  - bearerAuth: []
paths:
  /chat/completions:
    post:
      tags:
        - Chat Completions
      summary: Chat Completions
      description: Creates a model response for the given chat conversation.
      operationId: chat-completions
      requestBody:
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/ChatCompletionRequest'
                - $ref: '#/components/schemas/ChatCompletionVLMRequest'
      responses:
        '200':
          description: >-
            The response from the model. The response header contains the
            x-siliconcloud-trace-id field, which serves as a unique identifier
            for tracing requests, facilitating log queries and issue
            troubleshooting.
          headers:
            x-siliconcloud-trace-id:
              description: 请求追踪ID
              schema:
                type: string
            cache-control:
              description: 缓存控制
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChatCompletionResponse'
              examples:
                Default:
                  summary: Default
                  value:
                    id: 019bdaa55225ef854b320e9b838f77ce
                    object: chat.completion
                    created: 1768899826
                    model: Pro/zai-org/GLM-4.7
                    choices:
                      - index: 0
                        message:
                          role: assistant
                          content: 你好！...
                          reasoning_content: ...
                        finish_reason: stop
                    usage:
                      prompt_tokens: 15
                      completion_tokens: 1540
                      total_tokens: 1555
                      completion_tokens_details:
                        reasoning_tokens: 1190
                      prompt_tokens_details:
                        cached_tokens: 0
                      prompt_cache_hit_tokens: 0
                      prompt_cache_miss_tokens: 15
                    system_fingerprint: ''
                Streaming:
                  summary: Streaming
                  value:
                    id: 019bdaabd0514ee04b65607601e48651
                    object: chat.completion.chunk
                    created: 1768900251
                    model: Pro/zai-org/GLM-4.7
                    choices:
                      - index: 0
                        delta:
                          content: ''
                          reasoning_content: null
                          role: assistant
                        finish_reason: null
                    system_fingerprint: ''
                    usage:
                      prompt_tokens: 15
                      completion_tokens: 0
                      total_tokens: 15
                Image input:
                  summary: Image input
                  value:
                    id: 019bda85c39aba6a5fccce598dac8587
                    object: chat.completion
                    created: 1768897758
                    model: zai-org/GLM-4.6V
                    choices:
                      - index: 0
                        message:
                          role: assistant
                          content: ...
                          reasoning_content: ...
                        finish_reason: stop
                    usage:
                      prompt_tokens: 1383
                      completion_tokens: 205
                      total_tokens: 1588
                      completion_tokens_details:
                        reasoning_tokens: 118
                      prompt_tokens_details:
                        cached_tokens: 0
                      prompt_cache_hit_tokens: 0
                      prompt_cache_miss_tokens: 1383
                    system_fingerprint: ''
                Function:
                  summary: Function
                  value:
                    id: 019bda909755f42bd3785e4c1c8117bb
                    object: chat.completion
                    created: 1768898467
                    model: zai-org/GLM-4.6V
                    choices:
                      - index: 0
                        message:
                          role: assistant
                          content: ...
                          reasoning_content: ...
                          tool_calls:
                            - id: 019bda90bb06ea1f88f140889ff0916b
                              type: function
                              function:
                                name: get_current_weather
                                arguments: '{"location": "Boston, MA"}'
                        finish_reason: tool_calls
                    usage:
                      prompt_tokens: 216
                      completion_tokens: 135
                      total_tokens: 351
                      completion_tokens_details:
                        reasoning_tokens: 107
                      prompt_tokens_details:
                        cached_tokens: 0
                      prompt_cache_hit_tokens: 0
                      prompt_cache_miss_tokens: 216
                    system_fingerprint: ''
            text/event-stream:
              schema:
                $ref: '#/components/schemas/ChatCompletionStream'
              examples:
                Default:
                  summary: Default
                  value:
                    id: 019bdaa55225ef854b320e9b838f77ce
                    object: chat.completion
                    created: 1768899826
                    model: Pro/zai-org/GLM-4.7
                    choices:
                      - index: 0
                        message:
                          role: assistant
                          content: 你好！...
                          reasoning_content: ...
                        finish_reason: stop
                    usage:
                      prompt_tokens: 15
                      completion_tokens: 1540
                      total_tokens: 1555
                      completion_tokens_details:
                        reasoning_tokens: 1190
                      prompt_tokens_details:
                        cached_tokens: 0
                      prompt_cache_hit_tokens: 0
                      prompt_cache_miss_tokens: 15
                    system_fingerprint: ''
                Streaming:
                  summary: Streaming
                  value:
                    id: 019bdaabd0514ee04b65607601e48651
                    object: chat.completion.chunk
                    created: 1768900251
                    model: Pro/zai-org/GLM-4.7
                    choices:
                      - index: 0
                        delta:
                          content: ''
                          reasoning_content: null
                          role: assistant
                        finish_reason: null
                    system_fingerprint: ''
                    usage:
                      prompt_tokens: 15
                      completion_tokens: 0
                      total_tokens: 15
                Image input:
                  summary: Image input
                  value:
                    id: 019bda85c39aba6a5fccce598dac8587
                    object: chat.completion
                    created: 1768897758
                    model: zai-org/GLM-4.6V
                    choices:
                      - index: 0
                        message:
                          role: assistant
                          content: ...
                          reasoning_content: ...
                        finish_reason: stop
                    usage:
                      prompt_tokens: 1383
                      completion_tokens: 205
                      total_tokens: 1588
                      completion_tokens_details:
                        reasoning_tokens: 118
                      prompt_tokens_details:
                        cached_tokens: 0
                      prompt_cache_hit_tokens: 0
                      prompt_cache_miss_tokens: 1383
                    system_fingerprint: ''
                Function:
                  summary: Function
                  value:
                    id: 019bda909755f42bd3785e4c1c8117bb
                    object: chat.completion
                    created: 1768898467
                    model: zai-org/GLM-4.6V
                    choices:
                      - index: 0
                        message:
                          role: assistant
                          content: ...
                          reasoning_content: ...
                          tool_calls:
                            - id: 019bda90bb06ea1f88f140889ff0916b
                              type: function
                              function:
                                name: get_current_weather
                                arguments: '{"location": "Boston, MA"}'
                        finish_reason: tool_calls
                    usage:
                      prompt_tokens: 216
                      completion_tokens: 135
                      total_tokens: 351
                      completion_tokens_details:
                        reasoning_tokens: 107
                      prompt_tokens_details:
                        cached_tokens: 0
                      prompt_cache_hit_tokens: 0
                      prompt_cache_miss_tokens: 216
                    system_fingerprint: ''
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '429':
          $ref: '#/components/responses/RateLimit'
        '503':
          $ref: '#/components/responses/Overloaded'
        '504':
          $ref: '#/components/responses/Timeout'
      deprecated: false
      x-codeSamples:
        - lang: python
          label: Default
          source: |
            from openai import OpenAI

            client = OpenAI(
                api_key="YOUR_API_KEY",
                base_url="https://api.siliconflow.cn/v1"
            )

            response = client.chat.completions.create(
                model="Pro/zai-org/GLM-4.7",
                messages=[
                    {"role": "system", "content": "你是一个有用的助手"},
                    {"role": "user", "content": "你好，请介绍一下你自己"}
                ]
            )
            print(response.choices[0].message.content)
        - lang: curl
          label: Default
          source: |
            curl --request POST \
              --url https://api.siliconflow.cn/v1/chat/completions \
              -H "Content-Type: application/json" \
              -H "Authorization: Bearer YOUR_API_KEY" \
              -d '{
                "model": "Pro/zai-org/GLM-4.7",
                "messages": [
                  {"role": "system", "content": "你是一个有用的助手"},
                  {"role": "user", "content": "你好，请介绍一下你自己"}
                ]
              }'
        - lang: javaScript
          label: Default
          source: |
            fetch('https://api.siliconflow.cn/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_API_KEY'
              },
              body: JSON.stringify({
                model: 'Pro/zai-org/GLM-4.7',
                messages: [
                  {role: 'system', content: '你是一个有用的助手'},
                  {role: 'user', content: '你好，请介绍一下你自己'}
                ]
              })
            })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
        - lang: python
          label: Streaming
          source: |
            from openai import OpenAI
            client = OpenAI(
                api_key="YOUR_API_KEY",
                base_url="https://api.siliconflow.cn/v1"
            )
            response = client.chat.completions.create(
                model="Pro/zai-org/GLM-4.7",
                messages=[
                    {"role": "system", "content": "你是一个有用的助手"},
                    {"role": "user", "content": "你好，请介绍一下你自己"}
                ],
                stream=True
            )
            print(response.choices[0].message.content)
        - lang: curl
          label: Streaming
          source: |
            curl --request POST \
              --url https://api.siliconflow.cn/v1/chat/completions \
              -H "Content-Type: application/json" \
              -H "Authorization: Bearer YOUR_API_KEY" \
              -d '{
                "model": "Pro/zai-org/GLM-4.7",
                "messages": [
                  {"role": "system", "content": "你是一个有用的助手"},
                  {"role": "user", "content": "你好，请介绍一下你自己"}
                ],
                "stream": true
              }'
        - lang: javaScript
          label: Streaming
          source: |
            fetch('https://api.siliconflow.cn/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_API_KEY'
              },
              body: JSON.stringify({
                model: 'Pro/zai-org/GLM-4.7',
                messages: [
                  {role: 'system', content: '你是一个有用的助手'},
                  {role: 'user', content: '你好，请介绍一下你自己'}
                ],
                "stream": true,
              })
            })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
        - lang: python
          label: Image input
          source: |
            from openai import OpenAI
            client = OpenAI(
                api_key="YOUR_API_KEY",
                base_url="https://api.siliconflow.cn/v1"
            )
            response = client.chat.completions.create(
              model="zai-org/GLM-4.6V",
              messages=[
                  {
                    "role": "user",
                    "content": [
                      {"type": "text", "text": "What's in this image?"},
                      {
                        "type": "image_url",
                        "image_url": {
                            "url": "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/suggestion/lbygavkzjykewmmpnzfutkvedlowunms.png",
                          }
                      },
                    ],
                  }
              ],
              max_tokens=300,
            )
            print(response.choices[0])
        - lang: curl
          label: Image input
          source: |
            curl --location 'https://api.siliconflow.cn/v1/chat/completions' \
            --header 'Content-Type: application/json' \
            --header 'Authorization: Bearer YOUR_API_KEY' \
            --data '{
                "model": "zai-org/GLM-4.6V",
                "messages": [
                  {
                    "role": "user",
                    "content": [
                      {"type": "text", "text": "What'\''s in this image?"},
                      {
                        "type": "image_url",
                        "image_url": {
                            "url": "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/suggestion/lbygavkzjykewmmpnzfutkvedlowunms.png"
                        }
                      }
                    ]
                }
                ],
                "temperature": 0.7,
                "max_tokens": 1000
              }'
        - lang: javaScript
          label: Image input
          source: |
            fetch('https://api.siliconflow.cn/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_API_KEY'
              },
              body: JSON.stringify({
                model: 'zai-org/GLM-4.6V',
                messages: [
                  {role: 'user', content: 'What'\''s in this image?'},
                  {role: 'image_url', image_url: {url: 'https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/suggestion/lbygavkzjykewmmpnzfutkvedlowunms.png'}}
                ],
                temperature: 0.7,
                max_tokens: 1000
              })
            })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
        - lang: python
          label: Function
          source: >
            from openai import OpenAI

            client = OpenAI(
                api_key="YOUR_API_KEY",
                base_url="https://api.siliconflow.cn/v1"
            )

            tools = [
              {
                "type": "function",
                "function": {
                  "name": "get_current_weather",
                  "description": "Get the current weather in a given location",
                  "parameters": {
                    "type": "object",
                    "properties": {
                      "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                      },
                      "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                    },
                    "required": ["location"],
                  },
                }
              }
            ]

            messages = [{"role": "user", "content": "What's the weather like in
            Boston today?"}]

            completion = client.chat.completions.create(
              model="Pro/zai-org/GLM-4.7",
              messages=messages,
              tools=tools,
              tool_choice="auto"
            )

            print(completion)
        - lang: curl
          label: Function
          source: |
            curl --location 'https://api.siliconflow.cn/v1/chat/completions' \
            --header 'Content-Type: application/json' \
            --header 'Authorization: Bearer YOUR_API_KEY' \
            --data '{
              "model": "Pro/zai-org/GLM-4.7",
              "messages": [
                {
                  "role": "user",
                  "content": "What is the weather like in Boston today?"
                }
              ],
              "tools": [
                {
                  "type": "function",
                  "function": {
                    "name": "get_current_weather",
                    "description": "Get the current weather in a given location",
                    "parameters": {
                      "type": "object",
                      "properties": {
                        "location": {
                          "type": "string",
                          "description": "The city and state, e.g. San Francisco, CA"
                        },
                        "unit": {
                          "type": "string",
                          "enum": ["celsius", "fahrenheit"]
                        }
                      },
                      "required": ["location"]
                    }
                  }
                }
              ],
              "tool_choice": "auto"
            }'
        - lang: javaScript
          label: Function
          source: |
            const apiKey = 'YOUR_API_KEY';

            fetch('https://api.siliconflow.cn/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: "Pro/zai-org/GLM-4.7",
                messages: [
                  {
                    role: "user",
                    content: "What is the weather like in Boston today?"
                  }
                ],
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "get_current_weather",
                      description: "Get the current weather in a given location",
                      parameters: {
                        type: "object",
                        properties: {
                          location: {
                            type: "string",
                            description: "The city and state, e.g. San Francisco, CA"
                          },
                          unit: {
                            type: "string",
                            enum: ["celsius", "fahrenheit"]
                          }
                        },
                        required: ["location"]
                      }
                    }
                  }
                ],
                tool_choice: "auto"
              })
            })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
components:
  schemas:
    ChatCompletionRequest:
      title: LLM
      type: object
      required:
        - model
        - messages
      properties:
        model:
          type: string
          description: >-
            Corresponding Model Name. We periodically update our models to
            enhance service quality. Changes may include model on/offlining or
            capability adjustments. We will strive to notify you via
            announcements or push messages. **For a complete list of available
            models, please check the
            [Models](https://cloud.siliconflow.cn/sft-d29cs9gh3vvc73c59kb0/models?types=chat)**.
          example: Pro/zai-org/GLM-4.7
        messages:
          type: array
          description: A list of messages comprising the conversation so far.
          items:
            type: object
            properties:
              role:
                type: string
                description: >-
                  The role of the messages author. Choice between: system, user,
                  or assistant.
                example: user
                default: user
                enum:
                  - user
                  - assistant
                  - system
              content:
                oneOf:
                  - type: string
                    description: The contents of the message.
                    example: >-
                      What opportunities and challenges will the Chinese large
                      model industry face in 2025?
                    default: >-
                      What opportunities and challenges will the Chinese large
                      model industry face in 2025?
            required:
              - role
              - content
          minItems: 1
          maxItems: 10
        stream:
          type: boolean
          description: >-
            If set, tokens are returned as Server-Sent Events as they are made
            available. Stream terminates with `data: [DONE]`
          example: false
        max_tokens:
          type: integer
          description: >
            The maximum number of tokens to generate. Ensure that input tokens +
            max_tokens do not exceed the model’s context window. As some
            services are still being updated, avoid setting max_tokens to the
            window’s upper bound; reserve ~10k tokens as buffer for input and
            system overhead. See Models(https://cloud.siliconflow.cn/models) for
            details. 
          example: 4096
        enable_thinking:
          type: boolean
          description: >
            Switches between thinking and non-thinking modes.  This field
            supports the following models: 

                - Pro/zai-org/GLM-5
                - Pro/zai-org/GLM-4.7
                - deepseek-ai/DeepSeek-V3.2
                - Pro/deepseek-ai/DeepSeek-V3.2
                - zai-org/GLM-4.6
                - Qwen/Qwen3-8B
                - Qwen/Qwen3-14B
                - Qwen/Qwen3-32B
                - Qwen/Qwen3-30B-A3B
                - tencent/Hunyuan-A13B-Instruct
                - zai-org/GLM-4.5V
                - deepseek-ai/DeepSeek-V3.1-Terminus
                - Pro/deepseek-ai/DeepSeek-V3.1-Terminus        
                - Qwen/Qwen3.5-397B-A17B
                - Qwen/Qwen3.5-122B-A10B
                - Qwen/Qwen3.5-35B-A3B
                - Qwen/Qwen3.5-27B
                - Qwen/Qwen3.5-9B
                - Qwen/Qwen3.5-4B  
          example: false
        thinking_budget:
          type: integer
          description: >-
            Maximum number of tokens for chain-of-thought output. This field
            applies to most [Reasoning
            models](https://cloud.siliconflow.cn/me/models?tags=%E6%8E%A8%E7%90%86%E6%A8%A1%E5%9E%8B).
          example: 4096
          minimum: 128
          maximum: 32768
        reasoning_effort:
          type: string
          description: >
            This field only applies to deepseek-ai/DeepSeek-V4-Flash.

            In thinking mode, the default effort for regular requests is high;
            for certain complex agent-type requests (such as Claude Code,
            OpenCode), the effort is automatically set to max.

            In thinking mode, for compatibility reasons, low and medium are
            mapped to high, and xhigh is mapped to max. 
          example: high
          enum:
            - high
            - max
        min_p:
          type: number
          description: >-
            Dynamic filtering threshold that adapts based on token
            probabilities.This field only applies to Qwen3.
          format: float
          example: 0.05
          minimum: 0
          maximum: 1
        stop:
          description: >
            Up to 4 sequences where the API will stop generating further tokens.
            The returned text will not contain the stop sequence.
          nullable: true
          oneOf:
            - type: string
              example: null
              nullable: true
            - type: array
              minItems: 1
              maxItems: 4
              items:
                type: string
                example: 'null'
        temperature:
          type: number
          description: Determines the degree of randomness in the response.
          format: float
          example: 0.7
        top_p:
          type: number
          description: >-
            The `top_p` (nucleus) parameter is used to dynamically adjust the
            number of choices for each predicted token based on the cumulative
            probabilities.
          format: float
          example: 0.7
          default: 0.7
        top_k:
          type: number
          format: float
          example: 50
        frequency_penalty:
          type: number
          format: float
          example: 0.5
        'n':
          type: integer
          description: Number of generations to return
          example: 1
        response_format:
          type: object
          description: An object specifying the format that the model must output.
          properties:
            type:
              type: string
              description: The type of the response format.
              example: text
        tools:
          type: array
          description: >
            A list of tools the model may call. Currently, only functions are
            supported as a tool. Use this to provide a list of functions the
            model may generate JSON inputs for. A max of 128 functions are
            supported.
          items:
            $ref: '#/components/schemas/ChatCompletionTool'
    ChatCompletionVLMRequest:
      title: VLM
      type: object
      required:
        - model
        - messages
      properties:
        model:
          type: string
          description: >-
            Corresponding Model Name. To better enhance service quality, we will
            make periodic changes to the models provided by this service,
            including but not limited to model on/offlining and adjustments to
            model service capabilities. We will notify you of such changes
            through appropriate means such as announcements or message pushes
            where feasible.**For a complete list of available models, please
            check the
            [Models](https://cloud.siliconflow.cn/sft-d29cs9gh3vvc73c59kb0/models?tags=%E8%A7%86%E8%A7%89)**.
          example: deepseek-ai/DeepSeek-OCR
          default: deepseek-ai/DeepSeek-OCR
        messages:
          type: array
          description: A list of messages comprising the conversation so far.
          items:
            type: object
            properties:
              role:
                type: string
                description: >-
                  The role of the messages author. Choice between: system, user,
                  or assistant.
                example: user
                default: user
                enum:
                  - user
                  - assistant
                  - system
              content:
                oneOf:
                  - type: array
                    description: >-
                      An array of content parts with a defined type, each can be
                      of type `text` or `image_url` when passing in images. You
                      can pass multiple images by adding multiple `image_url`
                      content parts. The Qwen3-Omni series supports `video_url`
                      and `audio_url`, enabling the recognition of video and
                      audio content. The Qwen3-VL model also supports
                      `video_url`, allowing it to recognize video content.
                      Recommend videos and audio within 30 seconds.
                    items:
                      $ref: >-
                        #/components/schemas/ChatCompletionRequestUserMessageContentPart
                    minItems: 1
            required:
              - role
              - content
          minItems: 1
          maxItems: 10
        stream:
          type: boolean
          description: >-
            If set, tokens are returned as Server-Sent Events as they are made
            available. Stream terminates with `data: [DONE]`
          example: false
          default: false
        max_tokens:
          type: integer
          description: >
            The maximum number of tokens to generate. Ensure that input tokens +
            max_tokens do not exceed the model’s context window. As some
            services are still being updated, avoid setting max_tokens to the
            window’s upper bound; reserve ~10k tokens as buffer for input and
            system overhead. See Models(https://cloud.siliconflow.cn/models) for
            details. 
        stop:
          description: >
            Up to 4 sequences where the API will stop generating further tokens.
            The returned text will not contain the stop sequence.
          default: []
          nullable: true
          oneOf:
            - type: array
              minItems: 1
              maxItems: 4
              items:
                type: string
                example: 'null'
            - type: string
              default: <|endoftext|>
              example: |+

              nullable: true
            - type: string
              default: <|endoftext|>
              example: ''
              nullable: true
        temperature:
          type: number
          description: Determines the degree of randomness in the response.
          format: float
          example: 0.7
          default: 0.7
        top_p:
          type: number
          description: >-
            The `top_p` (nucleus) parameter is used to dynamically adjust the
            number of choices for each predicted token based on the cumulative
            probabilities.
          format: float
          example: 0.7
          default: 0.7
        top_k:
          type: number
          format: float
          example: 50
          default: 50
        frequency_penalty:
          type: number
          format: float
          example: 0.5
          default: 0.5
        'n':
          type: integer
          description: Number of generations to return
          example: 1
          default: 1
        response_format:
          type: object
          description: An object specifying the format that the model must output.
          properties:
            type:
              type: string
              description: The type of the response format.
              example: text
    ChatCompletionResponse:
      type: object
      properties:
        id:
          type: string
        choices:
          $ref: '#/components/schemas/ChatCompletionChoicesData'
        usage:
          $ref: '#/components/schemas/UsageData'
        created:
          type: integer
        model:
          type: string
        object:
          type: string
          enum:
            - chat.completion
    ChatCompletionStream:
      type: object
      properties:
        id:
          type: string
        choices:
          $ref: '#/components/schemas/ChatCompletionChoicesData'
        created:
          type: integer
        model:
          type: string
        object:
          type: string
          enum:
            - chat.completion.chunk
    ChatCompletionTool:
      type: object
      properties:
        type:
          type: string
          enum:
            - function
          description: The type of the tool. Currently, only `function` is supported.
        function:
          $ref: '#/components/schemas/FunctionObject'
      required:
        - type
        - function
    ChatCompletionRequestUserMessageContentPart:
      oneOf:
        - $ref: '#/components/schemas/ChatCompletionRequestMessageContentPartText'
        - $ref: '#/components/schemas/ChatCompletionRequestMessageContentPartImage'
        - $ref: '#/components/schemas/ChatCompletionRequestMessageContentPartAudio'
        - $ref: '#/components/schemas/ChatCompletionRequestMessageContentPartVideo'
      x-oaiExpandable: true
    ChatCompletionChoicesData:
      type: array
      items:
        type: object
        properties:
          message:
            type: object
            properties:
              role:
                type: string
                example: assistant
              content:
                type: string
              reasoning_content:
                description: >-
                  Only the deepseek-R1 series and Qwen/QwQ-32B models support
                  reasoning_content. This part returns the reasoning content,
                  which is at the same level as the content. In each round of
                  the conversation, the model outputs the reasoning chain
                  content (reasoning_content) and the final answer (content). In
                  the next round of the conversation, the reasoning chain
                  content from previous rounds will not be appended to the
                  context.
                type: string
              tool_calls:
                type: array
                description: The tool calls generated by the model, such as function calls.
                items:
                  $ref: '#/components/schemas/ChatCompletionMessageToolCall'
          finish_reason:
            $ref: '#/components/schemas/FinishReason'
    UsageData:
      type: object
      properties:
        prompt_tokens:
          type: integer
          description: Number of tokens in the prompt.
        completion_tokens:
          type: integer
          description: Number of tokens in the generated completion.
        total_tokens:
          type: integer
          description: Total number of tokens used in the request (prompt + completion).
        prompt_cache_hit_tokens:
          type: integer
          description: >-
            The number of tokens in the input of this request that resulted in a
            cache hit.
        prompt_cache_miss_tokens:
          type: integer
          description: >-
            The number of tokens in the input of this request that did not
            result in a cache hit.
        completion_tokens_details:
          type: object
          description: Breakdown of tokens used in a completion.
          properties:
            reasoning_tokens:
              type: integer
              default: 0
              description: Tokens generated by the model for reasoning.
        prompt_tokens_details:
          type: object
          description: Breakdown of tokens used in the prompt.
          properties:
            cached_tokens:
              type: integer
              default: 0
              description: Cached tokens present in the prompt.
      required:
        - prompt_tokens
        - completion_tokens
        - total_tokens
    BadRquestData:
      type: object
      required:
        - message
        - data
        - code
      properties:
        code:
          type: integer
          nullable: true
          default: false
          example: 20012
        message:
          type: string
          nullable: false
        data:
          type: string
          nullable: false
    UnauthorizedData:
      type: string
      default: false
      example: Invalid token
    ForbiddenData:
      type: string
      default: false
      example: Forbidden
    NotFoundData:
      type: string
      default: false
      example: 404 page not found
    RateLimitData:
      type: object
      required:
        - message
        - data
      properties:
        message:
          type: string
          example: >-
            Request was rejected due to rate limiting. If you want more, please
            contact contact@siliconflow.cn. Details:TPM limit reached.
        data:
          type: string
    OverloadedtData:
      type: object
      required:
        - code
        - message
        - data
      properties:
        code:
          type: integer
          example: 50505
        message:
          type: string
          example: Model service overloaded. Please try again later.
        data:
          type: string
          nullable: false
    TimeoutData:
      type: string
    FunctionObject:
      type: object
      properties:
        description:
          type: string
          description: >-
            A description of what the function does, used by the model to choose
            when and how to call the function.
        name:
          type: string
          description: >-
            The name of the function to be called. Must be a-z, A-Z, 0-9, or
            contain underscores and dashes, with a maximum length of 64.
        parameters:
          $ref: '#/components/schemas/FunctionParameters'
        strict:
          type: boolean
          nullable: true
          default: false
          description: >-
            Whether to enable strict schema adherence when generating the
            function call. If set to true, the model will follow the exact
            schema defined in the `parameters` field. Only a subset of JSON
            Schema is supported when `strict` is `true`. Learn more about
            Structured Outputs in the [function calling
            guide](docs/guides/function-calling).
      required:
        - name
    ChatCompletionRequestMessageContentPartText:
      type: object
      title: Text
      properties:
        type:
          type: string
          enum:
            - text
          description: The type of the content part.
          default: text
        text:
          type: string
          description: The text content.
          default: Describe this picture.
      required:
        - type
        - text
    ChatCompletionRequestMessageContentPartImage:
      type: object
      title: Image
      properties:
        type:
          type: string
          enum:
            - image_url
          description: The type of the image content part. deepseek-ai/DeepSeek-OCR
          default: image_url
        image_url:
          type: object
          properties:
            url:
              type: string
              description: >-
                Either a URL of the image or the base64 encoded image data. For
                model `deepseek-ai/DeepSeek-OCR`, PDF files are also supported
                via URL or base64; other models accept images only.
                TeleAI/TeleMM only support the base64 encoded image data.
              example: https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/dog.png
            detail:
              type: string
              description: >-
                Specifies the detail level of the image. For model
                `deepseek-ai/DeepSeek-OCR`, this field is not supported and uses
                fixed Base mode with 1024x1024 resolution.
              enum:
                - auto
                - low
                - high
              default: auto
          required:
            - url
      required:
        - type
        - image_url
    ChatCompletionRequestMessageContentPartAudio:
      type: object
      title: Audio
      properties:
        type:
          type: string
          enum:
            - audio_url
          description: The type of the audio content part.
          default: audio_url
        audio_url:
          type: object
          description: The audion url.
          properties:
            url:
              type: string
              description: Either a URL of the video or the base64 encoded video data.
              example: data:audio/mpeg;base64,
          required:
            - url
      required:
        - type
        - video_url
    ChatCompletionRequestMessageContentPartVideo:
      type: object
      title: Video
      properties:
        type:
          type: string
          enum:
            - video_url
          description: The type of the content part.
          default: video_url
        video_url:
          type: object
          properties:
            url:
              type: string
              description: Either a URL of the video or the base64 encoded video data.
              example: data:video/mp4;base64,
            detail:
              type: string
              description: Specifies the detail level of the video.
              enum:
                - auto
                - low
                - high
              default: auto
            max_frams:
              type: integer
              description: The upper limit for the total number of frames.
            fps:
              type: integer
              description: >
                The number of frames extracted per second from a video of length
                T seconds. The final number of frames is min(fps × T,
                max_frames).  For example:
                  - For a 10-second video with fps = 1 and max_frames = 8, the final number of frames is min(1 × 10, 8) = 8.
                  - For a 5-second video with fps = 2 and max_frames = 30, the final number of frames is min(2 × 5, 30) = 10.
          required:
            - url
      required:
        - type
        - video_url
    ChatCompletionMessageToolCall:
      type: object
      properties:
        id:
          type: string
          description: The ID of the tool call.
        type:
          type: string
          enum:
            - function
          description: The type of the tool. Currently, only `function` is supported.
        function:
          type: object
          description: The function that the model called.
          properties:
            name:
              type: string
              description: The name of the function to call.
            arguments:
              type: string
              description: >-
                The arguments to call the function with, as generated by the
                model in JSON format. Note that the model does not always
                generate valid JSON, and may hallucinate parameters not defined
                by your function schema. Validate the arguments in your code
                before calling your function.
          required:
            - name
            - arguments
      required:
        - id
        - type
        - function
    FinishReason:
      type: string
      enum:
        - stop
        - eos
        - length
        - tool_calls
    FunctionParameters:
      type: object
      description: >-
        The parameters the functions accepts, described as a JSON Schema object.
        See the [guide](/guides/function_calling) for examples, and the [JSON
        Schema reference](https://json-schema.org/understanding-json-schema/)
        for documentation about the format. 

        Omitting `parameters` defines a function with an empty parameter list.
      additionalProperties: true
  responses:
    BadRequest:
      description: BadRequest
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/BadRquestData'
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UnauthorizedData'
    Forbidden:
      description: Forbidden
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ForbiddenData'
    NotFound:
      description: NotFound
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/NotFoundData'
    RateLimit:
      description: RateLimit
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/RateLimitData'
    Overloaded:
      description: Overloaded
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OverloadedtData'
    Timeout:
      description: Timeout
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/TimeoutData'
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: your api key
      description: >-
        Use the following format for authentication: Bearer [<your api
        key>](https://cloud.siliconflow.cn/account/ak)

```