> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Messages API

> Use the Anthropic API compatible Messages format to call MiniMax models.

<Note>
  ✨ **New model — `MiniMax-M3`**

  **Core capabilities**: **Coding/Agentic SOTA**, **1M long context**, **multimodal**.
</Note>

<Tip>
  **What's new in `MiniMax-M3`:**

  1. Image and video understanding — see the example code on the right
  2. Control thinking via the `thinking` parameter
</Tip>


## OpenAPI

````yaml /api-reference/text/api/openapi-chat-anthropic.json POST /anthropic/v1/messages
openapi: 3.1.0
info:
  title: MiniMax Text API Anthropic
  description: >
    MiniMax text generation API with support for chat completion and streaming
    output.


    > ⚡ **`MiniMax-M3` highlights** — **Coding/Agentic SOTA**, **1M long
    context**, and **multimodal**.
  license:
    name: MIT
  version: 1.0.0
servers:
  - url: https://api.minimax.io
security:
  - bearerAuth: []
  - apiKeyAuth: []
paths:
  /anthropic/v1/messages:
    post:
      tags:
        - Text Generation
      summary: Text Generation Anthropic
      operationId: chatCompletionAnthropic
      parameters:
        - name: Content-Type
          in: header
          required: true
          description: >-
            Media type of the request body, should be set to `application/json`
            to ensure JSON format
          schema:
            type: string
            enum:
              - application/json
            default: application/json
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateMessageReq'
            examples:
              Image Understanding:
                value:
                  model: MiniMax-M3
                  thinking:
                    type: adaptive
                  messages:
                    - role: user
                      content:
                        - type: text
                          text: What does this image show?
                        - type: image
                          source:
                            type: url
                            url: >-
                              https://filecdn.minimax.chat/public/fe9d04da-f60e-444d-a2e0-18ae743add33.jpeg
                  max_tokens: 500
              Video Understanding:
                value:
                  model: MiniMax-M3
                  thinking:
                    type: adaptive
                  messages:
                    - role: user
                      content:
                        - type: text
                          text: What is happening in this video?
                        - type: video
                          source:
                            type: url
                            url: >-
                              https://filecdn.minimax.chat/public/ee8c1648-21f1-41b7-8397-65022d22ffe5.mp4
                  max_tokens: 1024
              Deep Thinking:
                value:
                  model: MiniMax-M3
                  thinking:
                    type: adaptive
                  messages:
                    - role: user
                      content: Which is bigger, 9.11 or 9.9?
                  max_tokens: 1024
              Stream:
                value:
                  model: MiniMax-M3
                  thinking:
                    type: adaptive
                  messages:
                    - role: user
                      content:
                        - type: text
                          text: What does this image show?
                        - type: image
                          source:
                            type: url
                            url: >-
                              https://filecdn.minimax.chat/public/fe9d04da-f60e-444d-a2e0-18ae743add33.jpeg
                  stream: true
                  max_tokens: 500
              Tool Use:
                value:
                  model: MiniMax-M3
                  messages:
                    - role: user
                      content: How's the weather in San Francisco?
                  max_tokens: 1024
                  tools:
                    - name: get_weather
                      description: Get the current weather for a given location.
                      input_schema:
                        type: object
                        properties:
                          location:
                            type: string
                            description: The city and state/country, e.g. San Francisco, US
                        required:
                          - location
                  tool_choice:
                    type: auto
        required: true
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreateMessageResp'
              examples:
                Image Understanding:
                  value:
                    id: 066a3730f92943410551c4b4978ddad1
                    type: message
                    role: assistant
                    model: MiniMax-M3
                    content:
                      - thinking: >-
                          The user is asking what the image shows. I can
                          describe this image of a young child.
                        signature: >-
                          db8ecae1e5a63cabebd69d2625983499bb498bfd329dde5c3cede76f12896336
                        type: thinking
                      - text: >-
                          This image shows a young girl, probably around 4-5
                          years old, photographed in a close-up portrait style.
                          She has:


                          - **Wavy, tousled light brown hair** with bangs that
                          fall across her forehead, with some strands appearing
                          slightly messy or windblown

                          - **Large, expressive hazel-green eyes** that are
                          looking directly at the camera

                          - **A soft, subtle smile** giving her a warm, gentle
                          expression

                          - **Fair skin** with rosy cheeks, illuminated by warm,
                          soft lighting


                          She's wearing what appears to be a **cream or
                          off-white dress** with delicate lace or ruffled
                          detailing around the neckline and shoulders.


                          The photograph has a **professional portrait
                          quality**, with a softly blurred, neutral
                          grayish-beige background and warm directional lighting
                          that creates a classic, painterly aesthetic. The
                          composition and styling suggest this could be a formal
                          portrait or an AI-generated image with a
                          vintage/realistic photographic style.
                        type: text
                    usage:
                      input_tokens: 1209
                      output_tokens: 214
                      cache_creation_input_tokens: 0
                      cache_read_input_tokens: 157
                    stop_reason: end_turn
                Video Understanding:
                  value:
                    id: 066b458956dd2902de31eae19cf15c6e
                    type: message
                    role: assistant
                    model: MiniMax-M3
                    content:
                      - thinking: >-
                          The user wants to know what is happening in the video.


                          1.  **Analyze the video:**
                              *   The video is a meme/edited clip.
                              *   It starts with a cat (specifically a Bengal cat, looks like a Savannah cat or similar breed) walking on a diving board at the Olympics (London 2012).
                              *   The cat is edited into the scene, replacing a human diver.
                              *   The cat walks to the end of the board.
                              *   The cat then jumps off the diving board into the pool.
                              *   The people in the background are real, reacting (or rather, just sitting there, as it's a static crowd image or very slow movement).
                              *   The text "MINIMAX | Hailuo AI" is visible, indicating it's an AI-generated video.

                          2.  **Describe the action:**
                              *   A cat walks on a diving board.
                              *   The cat jumps off the diving board.
                              *   The setting is an Olympic-sized pool.

                          3.  **Synthesize the description:**
                              *   Start with the main subject: a cat.
                              *   Describe the location: a diving board at a swimming pool.
                              *   Describe the action: walking, then jumping off.
                              *   Combine into a concise sentence: "A cat is seen walking on a diving board and then jumping off into a swimming pool."

                          4.  **Review against the video:**
                              *   Does the video show a cat? Yes.
                              *   Does it show a diving board? Yes.
                              *   Does the cat jump off? Yes.
                              *   Is there a swimming pool below? Yes.
                              *   The description is accurate and covers the key events in the short clip.

                          5.  **Final Output Generation:** Present the
                          synthesized description clearly.
                        signature: >-
                          4849e0d596e25f03504dbb4eee7316fc48714dc86b93c9b7dd63adef7f4aa9b2
                        type: thinking
                      - text: >-
                          A cat is seen walking on a diving board and then
                          jumping off into a swimming pool.
                        type: text
                    usage:
                      input_tokens: 349
                      output_tokens: 393
                      cache_creation_input_tokens: 0
                      cache_read_input_tokens: 1896
                    stop_reason: end_turn
                Deep Thinking:
                  value:
                    id: 066b367ba949a58a9d6829b4bf8cbcd4
                    type: message
                    role: assistant
                    model: MiniMax-M3
                    content:
                      - thinking: |-
                          The user is asking which is bigger, 9.11 or 9.9.

                          9.11 vs 9.9

                          9.9 is greater than 9.11.

                          To compare: 9.11 = 9.11 and 9.9 = 9.90

                          9.90 > 9.11, so 9.9 is bigger.
                        signature: >-
                          6d0315c818f9664ff185dabaa22cd89f2bf28a3a52122095bce23d905471ec5f
                        type: thinking
                      - text: >-
                          **9.9 is bigger than 9.11.**


                          To compare decimals, it helps to write them with the
                          same number of decimal places:

                          - 9.11 = 9.11

                          - 9.9 = 9.90


                          Since 9.90 > 9.11, **9.9 is larger**.
                        type: text
                    usage:
                      input_tokens: 13
                      output_tokens: 149
                      cache_creation_input_tokens: 0
                      cache_read_input_tokens: 159
                    stop_reason: end_turn
                Stream:
                  value:
                    - type: message_start
                      message:
                        id: 066a3766d21ce23c8afc5e85a427036c
                        type: message
                        role: assistant
                        content: []
                        model: MiniMax-M3
                        stop_reason: null
                        stop_sequence: null
                        usage:
                          input_tokens: 0
                          output_tokens: 0
                          cache_creation_input_tokens: 0
                          cache_read_input_tokens: 1366
                        service_tier: standard
                    - type: ping
                    - type: content_block_start
                      index: 0
                      content_block:
                        type: thinking
                        thinking: ''
                    - type: content_block_delta
                      index: 0
                      delta:
                        type: thinking_delta
                        thinking: The user
                    - type: content_block_delta
                      index: 0
                      delta:
                        type: thinking_delta
                        thinking: ' is asking me to describe what an image shows. I should describe the image objectively, focusing on'
                    - type: content_block_delta
                      index: 0
                      delta:
                        type: thinking_delta
                        thinking: ' visible features without identifying the person.'
                    - type: content_block_delta
                      index: 0
                      delta:
                        type: signature_delta
                        signature: >-
                          69b031ac42358c4e99f8f80f5ea48ff9cec06ca68500428ee1145e16a8020843
                    - type: content_block_stop
                      index: 0
                    - type: content_block_start
                      index: 1
                      content_block:
                        type: text
                        text: ''
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: The image shows a close-up portrait of a young girl
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: >-
                          , probably around 3-5 years old. She has the following
                          features:


                          - **Hair
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: >-
                          **: Wavy, light brown/auburn hair with bangs across
                          her forehead, with some
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: |2-
                           strands appearing to be pulled up
                          - **Eyes**: Large, expressive brown/amber eyes looking
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: >2-
                           directly at the camera
                          - **Expression**: A subtle, closed-mouth smile that
                          gives her a gentle
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: >-
                          , slightly mischievous look

                          - **Clothing**: She's wearing a white or cream-colored
                          top with delicate
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: |2-
                           lace or ruffled trim around the neckline and sleeves
                          - **Lighting**: The photo uses
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: |2-
                           warm, soft lighting that creates a gentle glow on her face
                          - **Background**: A muted, neutral
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: |2-
                           brownish-gray backdrop that keeps the focus entirely on her

                          The overall aesthetic has
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: ' a professional, portrait-photography quality with a warm, vintage feel to the color tones'
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: .
                    - type: content_block_stop
                      index: 1
                    - type: message_delta
                      delta:
                        stop_reason: end_turn
                      usage:
                        input_tokens: 1252
                        output_tokens: 213
                        cache_creation_input_tokens: 0
                        cache_read_input_tokens: 114
                    - type: message_stop
                Tool Use:
                  value:
                    id: 066b133406cd8cfd88eb3b2b893a5daa
                    type: message
                    role: assistant
                    model: MiniMax-M3
                    content:
                      - thinking: >-
                          The user is asking about the weather in San Francisco.
                          I have access to a get_weather tool that can provide
                          this information. I need to format the location
                          parameter appropriately - the example shows "San
                          Francisco, US" as the format.
                        signature: >-
                          fa86efec7c27d4aa23eac60ba7a1f4e5f0f37a18d6ec4944fe495aebb6bd0930
                        type: thinking
                      - text: >-
                          I'll check the current weather in San Francisco for
                          you.
                        type: text
                      - type: tool_use
                        id: call_function_9pjh8jjdebck_1
                        name: get_weather
                        input:
                          location: San Francisco, US
                    usage:
                      input_tokens: 14
                      output_tokens: 91
                      cache_creation_input_tokens: 0
                      cache_read_input_tokens: 404
                    stop_reason: tool_use
            text/event-stream:
              schema:
                $ref: '#/components/schemas/StreamEvent'
              examples:
                Stream:
                  value:
                    - type: message_start
                      message:
                        id: 066a3766d21ce23c8afc5e85a427036c
                        type: message
                        role: assistant
                        content: []
                        model: MiniMax-M3
                        stop_reason: null
                        stop_sequence: null
                        usage:
                          input_tokens: 0
                          output_tokens: 0
                          cache_creation_input_tokens: 0
                          cache_read_input_tokens: 1366
                        service_tier: standard
                    - type: ping
                    - type: content_block_start
                      index: 0
                      content_block:
                        type: thinking
                        thinking: ''
                    - type: content_block_delta
                      index: 0
                      delta:
                        type: thinking_delta
                        thinking: The user
                    - type: content_block_delta
                      index: 0
                      delta:
                        type: thinking_delta
                        thinking: ' is asking me to describe what an image shows. I should describe the image objectively, focusing on'
                    - type: content_block_delta
                      index: 0
                      delta:
                        type: thinking_delta
                        thinking: ' visible features without identifying the person.'
                    - type: content_block_delta
                      index: 0
                      delta:
                        type: signature_delta
                        signature: >-
                          69b031ac42358c4e99f8f80f5ea48ff9cec06ca68500428ee1145e16a8020843
                    - type: content_block_stop
                      index: 0
                    - type: content_block_start
                      index: 1
                      content_block:
                        type: text
                        text: ''
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: The image shows a close-up portrait of a young girl
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: >-
                          , probably around 3-5 years old. She has the following
                          features:


                          - **Hair
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: >-
                          **: Wavy, light brown/auburn hair with bangs across
                          her forehead, with some
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: |2-
                           strands appearing to be pulled up
                          - **Eyes**: Large, expressive brown/amber eyes looking
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: >2-
                           directly at the camera
                          - **Expression**: A subtle, closed-mouth smile that
                          gives her a gentle
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: >-
                          , slightly mischievous look

                          - **Clothing**: She's wearing a white or cream-colored
                          top with delicate
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: |2-
                           lace or ruffled trim around the neckline and sleeves
                          - **Lighting**: The photo uses
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: |2-
                           warm, soft lighting that creates a gentle glow on her face
                          - **Background**: A muted, neutral
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: |2-
                           brownish-gray backdrop that keeps the focus entirely on her

                          The overall aesthetic has
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: ' a professional, portrait-photography quality with a warm, vintage feel to the color tones'
                    - type: content_block_delta
                      index: 1
                      delta:
                        type: text_delta
                        text: .
                    - type: content_block_stop
                      index: 1
                    - type: message_delta
                      delta:
                        stop_reason: end_turn
                      usage:
                        input_tokens: 1252
                        output_tokens: 213
                        cache_creation_input_tokens: 0
                        cache_read_input_tokens: 114
                    - type: message_stop
        '400':
          description: >-
            Invalid request parameters (missing required fields, type not in the
            whitelist, tool_use.input not a JSON object, etc.).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                type: error
                request_id: req_xxxxxxxx
                error:
                  type: invalid_request_error
                  message: 'messages.0.content.1: unsupported content type ''foo'''
        '401':
          description: API key missing or invalid.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                type: error
                request_id: req_xxxxxxxx
                error:
                  type: authentication_error
                  message: API key missing or invalid.
        '403':
          description: No permission to access this model or path.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                type: error
                request_id: req_xxxxxxxx
                error:
                  type: permission_error
                  message: No permission to access this model or path.
        '404':
          description: Model does not exist.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                type: error
                request_id: req_xxxxxxxx
                error:
                  type: not_found_error
                  message: Model does not exist.
        '413':
          description: >-
            Request body exceeds 64 MB, or a multimodal file exceeds the size
            limit.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                type: error
                request_id: req_xxxxxxxx
                error:
                  type: request_too_large
                  message: >-
                    Request body exceeds 64 MB, or a multimodal file exceeds the
                    size limit.
        '429':
          description: RPM / TPM / connection-count or other rate limit triggered.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                type: error
                request_id: req_xxxxxxxx
                error:
                  type: rate_limit_error
                  message: RPM / TPM / connection-count or other rate limit triggered.
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                type: error
                request_id: req_xxxxxxxx
                error:
                  type: api_error
                  message: Internal server error.
        '529':
          description: Upstream model overloaded; retryable.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                type: error
                request_id: req_xxxxxxxx
                error:
                  type: overloaded_error
                  message: Upstream model overloaded; retryable.
components:
  schemas:
    CreateMessageReq:
      type: object
      required:
        - model
        - messages
      properties:
        model:
          type: string
          description: >-
            Model ID. MiniMax-M3 is a multimodal model with native support for
            text, image, and video input, alongside tool use and thinking
            content blocks. The M2.7, M2.5, M2.1, and M2 series support text and
            tool calls only and do not accept image or video input.
          enum:
            - MiniMax-M3
            - MiniMax-M2.7
            - MiniMax-M2.7-highspeed
            - MiniMax-M2.5
            - MiniMax-M2.5-highspeed
            - MiniMax-M2.1
            - MiniMax-M2.1-highspeed
            - MiniMax-M2
        service_tier:
          type: string
          description: >-
            Service tier for request admission. Supported values are `standard`
            and `priority`. If omitted, the request uses the `standard` tier.
            The `priority` [price](/guides/pricing-paygo) is 1.5 times the
            `standard` price and ensures priority admission so the request is
            processed ahead of other requests, leading to faster responses and
            fewer failures.
          enum:
            - standard
            - priority
          default: standard
        system:
          description: Set the role and behavior of the model.
          oneOf:
            - type: string
              description: Plain text system prompt
            - type: array
              description: >-
                System prompt in content block array format. Text blocks can
                include cache_control.
              items:
                type: object
                properties:
                  type:
                    type: string
                    enum:
                      - text
                    description: Content block type
                  text:
                    type: string
                    description: Text content
                  cache_control:
                    $ref: '#/components/schemas/CacheControl'
                required:
                  - type
                  - text
        messages:
          type: array
          description: >-
            Conversation history. MiniMax-M3 supports text, image, video, tool
            use, tool result, and thinking content blocks. The M2.7, M2.5, M2.1,
            and M2 series support text and tool-call content blocks only; they
            do not support image or video input.
          items:
            $ref: '#/components/schemas/Message'
        stream:
          type: boolean
          description: >-
            Whether to use streaming output, defaults to `false`. When set to
            `true`, the response will be returned in chunks
          default: false
        max_tokens:
          type: integer
          format: int64
          description: >-
            Specifies the upper limit for generated content length (in tokens).
            For MiniMax-M3 the recommended value is 131072 (128K) and the
            maximum is 524288 (512K); for other models the recommended value is
            65536 (64K) and the maximum is 204800 (200K). Content exceeding the
            limit will be truncated. If generation stops due to `length`, try
            increasing this value
          minimum: 1
        temperature:
          type: number
          format: double
          description: >-
            Temperature coefficient, affects output randomness. Range [0, 2],
            default 1. Higher values produce more random output; lower values
            produce more deterministic output.
          minimum: 0
          maximum: 2
          default: 1
        top_p:
          type: number
          format: double
          description: >-
            Nucleus sampling parameter. Range [0, 1]. Default is 0.95 for
            MiniMax-M3 and 0.9 for M2.x models.
          minimum: 0
          maximum: 1
          default: 0.95
        tools:
          type: array
          description: Tool definitions for Anthropic-compatible tool use.
          items:
            $ref: '#/components/schemas/Tool'
        tool_choice:
          $ref: '#/components/schemas/ToolChoice'
        thinking:
          type: object
          description: >-
            Controls MiniMax-M3 thinking. When omitted, thinking is disabled by
            default and responses do not include thinking blocks. For M2.x
            models, thinking cannot be disabled.
          properties:
            type:
              type: string
              enum:
                - disabled
                - adaptive
              default: disabled
              description: >-
                Thinking control type.

                - `disabled`: Disable MiniMax-M3 thinking output. This is the
                default when `thinking` is omitted. For M2.x models, thinking
                remains on.

                - `adaptive`: Enable MiniMax-M3 thinking output and return
                thinking blocks.
          required: []
        metadata:
          type: object
          description: >-
            Request metadata. user_id is recommended for end-user-level
            aggregation, rate limiting, and billing analysis.
          properties:
            user_id:
              type: string
              description: End-user ID.
    CreateMessageResp:
      type: object
      properties:
        id:
          type: string
          description: Unique ID of this response
        type:
          type: string
          description: Object type, fixed as `message`
          enum:
            - message
        role:
          type: string
          description: Role, fixed as `assistant`
          enum:
            - assistant
        model:
          type: string
          description: Model ID used for this request
        content:
          type: array
          description: List of response content blocks
          items:
            $ref: '#/components/schemas/ResponseContentBlock'
        stop_reason:
          type: string
          description: |-
            Reason for stopping generation:
            - end_turn: Model ended naturally
            - max_tokens: Reached max_tokens limit
            - tool_use: Model requested tool use
          enum:
            - end_turn
            - max_tokens
            - tool_use
        usage:
          $ref: '#/components/schemas/Usage'
    StreamEvent:
      type: object
      description: ''
      required:
        - type
      properties:
        type:
          type: string
          description: >-
            Event type:

            - `message_start`: Message start, contains complete message metadata

            - `ping`: Heartbeat event

            - `content_block_start`: Content block start

            - `content_block_delta`: Content block incremental update

            - `content_block_stop`: Content block end

            - `message_delta`: Message-level incremental update (e.g.,
            stop_reason)

            - `message_stop`: Message end
          enum:
            - message_start
            - ping
            - content_block_start
            - content_block_delta
            - content_block_stop
            - message_delta
            - message_stop
        message:
          type: object
          description: Message object (returned when `type` is `message_start`)
          properties:
            id:
              type: string
              description: Unique ID of the message
            type:
              type: string
              enum:
                - message
            role:
              type: string
              enum:
                - assistant
            content:
              type: array
              description: Content block list, initially an empty array
              items:
                $ref: '#/components/schemas/ResponseContentBlock'
            model:
              type: string
              description: Model ID
            stop_reason:
              type: string
              nullable: true
              description: Stop reason, null at the start of streaming
            stop_sequence:
              type: string
              nullable: true
              description: Stop sequence, null at the start of streaming
            usage:
              $ref: '#/components/schemas/Usage'
        index:
          type: integer
          description: >-
            Index of the content block (returned for `content_block_start`,
            `content_block_delta`, `content_block_stop`)
        content_block:
          $ref: '#/components/schemas/ResponseContentBlock'
          description: Content block object (returned when `type` is `content_block_start`)
        delta:
          type: object
          description: >-
            Incremental update content (returned for `content_block_delta` or
            `message_delta`)
          properties:
            type:
              type: string
              description: >-
                Delta type, for example text_delta, thinking_delta, or
                signature_delta.
              enum:
                - text_delta
                - thinking_delta
                - signature_delta
            text:
              type: string
              description: Incremental text content
            stop_reason:
              type: string
              description: Reason for stopping generation.
              enum:
                - end_turn
                - max_tokens
                - tool_use
        usage:
          $ref: '#/components/schemas/Usage'
          description: Token usage (returned for `message_delta`)
    ErrorResponse:
      type: object
      description: >-
        Error response. Uses an HTTP status code plus a JSON body. When an error
        occurs during streaming, it is delivered as an `event: error` SSE event
        with the same body structure; clients should stop reading and clean up
        the session state after receiving an error.
      properties:
        type:
          type: string
          enum:
            - error
          description: Always `error`.
        request_id:
          type: string
          description: Unique identifier of the request, useful for troubleshooting.
        error:
          type: object
          properties:
            type:
              type: string
              description: Error type.
              enum:
                - invalid_request_error
                - authentication_error
                - permission_error
                - not_found_error
                - request_too_large
                - rate_limit_error
                - api_error
                - overloaded_error
            message:
              type: string
              description: Error details.
    CacheControl:
      type: object
      description: Prompt cache marker.
      properties:
        type:
          type: string
          enum:
            - ephemeral
          description: Prompt cache marker.
      required:
        - type
    Message:
      type: object
      required:
        - role
        - content
      properties:
        role:
          type: string
          enum:
            - user
            - assistant
            - user_system
            - group
            - sample_message_user
            - sample_message_ai
          description: >-
            Role of the message sender. MiniMax-M3 uses alternating user /
            assistant messages.
        content:
          description: >-
            Message content. MiniMax-M3 supports text, image, video, tool use,
            tool result, and thinking content blocks.
          oneOf:
            - type: string
              description: Plain text message
            - type: array
              description: >-
                Message content. MiniMax-M3 supports text, image, video, tool
                use, tool result, and thinking content blocks.
              items:
                $ref: '#/components/schemas/RequestContentBlock'
    Tool:
      type: object
      description: Tool definitions for Anthropic-compatible tool use.
      properties:
        name:
          type: string
          description: Tool name.
        description:
          type: string
          description: Tool description.
        input_schema:
          type: object
          description: Tool input parameters JSON Schema.
        cache_control:
          $ref: '#/components/schemas/CacheControl'
      required:
        - name
        - input_schema
    ToolChoice:
      type: object
      description: Tool selection strategy. Only auto and none are supported.
      properties:
        type:
          type: string
          enum:
            - auto
            - none
          description: Tool choice type.
      required:
        - type
    ResponseContentBlock:
      type: object
      description: >-
        Content block returned in response messages. The model emits text,
        tool_use (when calling tools), and thinking (when extended thinking is
        active). Responses never contain image, video, tool_result, or
        mid_conv_system blocks.
      required:
        - type
      properties:
        type:
          type: string
          description: |-
            Content block type:
            - text: Text content
            - tool_use: Model tool call
            - thinking: Model thinking content
          enum:
            - text
            - tool_use
            - thinking
        text:
          type: string
          description: Text content when type=text.
        id:
          type: string
          description: Tool call ID returned when type=tool_use.
        name:
          type: string
          description: Tool name returned when type=tool_use.
        input:
          type: object
          description: Tool input returned when type=tool_use.
        thinking:
          type: string
          description: Model thinking content when type=thinking.
        signature:
          type: string
          description: Signature for thinking content. Return unchanged in later turns.
    Usage:
      type: object
      description: >-
        Token usage for this request, including prompt cache usage when
        applicable.
      properties:
        input_tokens:
          type: integer
          description: Number of tokens consumed by input
        output_tokens:
          type: integer
          description: Number of tokens consumed by output
        cache_creation_input_tokens:
          type: integer
          description: Number of input tokens used to create prompt cache entries.
        cache_read_input_tokens:
          type: integer
          description: Number of input tokens read from prompt cache.
    RequestContentBlock:
      type: object
      description: >-
        Content block accepted in request messages. text and tool blocks are
        supported by all models; image and video blocks are MiniMax-M3 only.
        thinking is only used when echoing a prior assistant turn back to the
        model.
      required:
        - type
      properties:
        type:
          type: string
          description: |-
            Content block type:
            - text: Text content
            - image: Image input, MiniMax-M3 only
            - video: Video input, MiniMax-M3 only
            - tool_use: Echoed assistant tool call from a previous turn
            - tool_result: Tool execution result
            - thinking: Echoed assistant thinking from a previous turn
            - mid_conv_system: System instructions inserted mid-conversation
          enum:
            - text
            - image
            - video
            - tool_use
            - tool_result
            - thinking
            - mid_conv_system
        text:
          type: string
          description: Text content when type=text.
        source:
          $ref: '#/components/schemas/MediaSource'
          description: >-
            Image or video source when type=image or type=video. MiniMax-M3
            only.
        id:
          type: string
          description: Tool call ID when echoing type=tool_use.
        name:
          type: string
          description: Tool name when echoing type=tool_use.
        input:
          type: object
          description: Tool input when echoing type=tool_use.
        tool_use_id:
          type: string
          description: ID of the matching tool_use block when type=tool_result.
        content:
          oneOf:
            - type: string
            - type: array
              items:
                $ref: '#/components/schemas/RequestContentBlock'
          description: >-
            Tool execution result, either a string or an array of text/image
            content blocks.
        thinking:
          type: string
          description: Echoed assistant thinking content when type=thinking.
        signature:
          type: string
          description: >-
            Signature for echoed thinking content. Return unchanged in later
            turns.
        cache_control:
          $ref: '#/components/schemas/CacheControl'
    MediaSource:
      type: object
      description: >-
        Media source for image or video blocks.


        **Supported image formats**


        | Format | Common extensions | MIME Type |

        | :-- | :-- | :-- |

        | JPEG | .jpg, .jpeg | image/jpeg |

        | PNG | .png | image/png |

        | GIF | .gif | image/gif |

        | WEBP | .webp | image/webp |


        **Supported video formats**


        | Format | Common extensions | MIME Type |

        | :-- | :-- | :-- |

        | MP4 | .mp4 | video/mp4 |

        | AVI | .avi | video/avi or video/x-msvideo |

        | MOV | .mov | URL input: set the object storage Content-Type to
        video/quicktime; base64 input: use video/mov, i.e.
        data:video/mov;base64,<BASE64_ENCODING> |

        | MKV | .mkv | video/x-matroska |


        **File size and request limits**

        - URL or Base64 input: video file ≤ 50 MB, image file ≤ 10 MB, request
        body ≤ 64 MB.

        - Files API upload: referenced as `mm_file://{file_id}`, with a single
        video up to 512 MB.
      properties:
        type:
          type: string
          enum:
            - base64
            - url
          description: Media source type.
        media_type:
          type: string
          description: Required for base64 input, for example image/png or video/mp4.
        data:
          type: string
          description: Base64-encoded media bytes.
        url:
          type: string
          description: >-
            Public URL. Videos can also use a Files API reference in the form
            `mm_file://{file_id}`. To obtain a `file_id`, first upload the video
            via the [Upload File](/api-reference/file-management-upload) API.
        detail:
          type: string
          enum:
            - low
            - default
            - high
          default: default
          description: >-
            Understanding detail level. Defaults to default.


            For image input, rough single-image token usage heuristic:


            | detail | Rough token usage |

            | :-- | :-- |

            | low | Usually a few hundred tokens, up to ~600 |

            | default | Often ~1k-3k tokens, up to ~5k |

            | high | Often several thousand tokens, up to ~15k+ |


            Actual usage depends on image size and content; use `POST
            /anthropic/v1/messages/count_tokens` or response usage for exact
            usage.
        fps:
          type: number
          minimum: 0.2
          maximum: 5
          default: 1
          description: >-
            Video frame sampling rate. Defaults to 1. Range [0.2, 5].

            - Higher values: more sensitive to scene changes, but higher token
            cost and slower response.

            - Lower values: lower token cost and faster response, but less
            sensitive to scene changes.
        max_long_side_pixel:
          type: integer
          minimum: 1
          description: Longest-side pixel limit for the image or video frames.
      required:
        - type
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: >-
        Bearer API Key auth. Send Authorization: Bearer <API_KEY>. If
        Authorization and x-api-key are both present, Authorization takes
        precedence.
    apiKeyAuth:
      type: apiKey
      in: header
      name: x-api-key
      description: >-
        Anthropic-compatible API Key auth. Send x-api-key: <API_KEY>.
        Authorization: Bearer <API_KEY> is recommended.

````