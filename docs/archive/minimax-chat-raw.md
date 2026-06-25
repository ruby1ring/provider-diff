> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Chat Completions API

> Use the OpenAI API compatible Chat Completions format to call MiniMax models.

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

````yaml /api-reference/text/api/openapi-chat-openai.json POST /v1/chat/completions
openapi: 3.1.0
info:
  title: MiniMax Text API OpenAI
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
paths:
  /v1/chat/completions:
    post:
      tags:
        - Text Generation
      summary: Text Generation OpenAI
      operationId: chatCompletionOpenAI
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
              $ref: '#/components/schemas/ChatCompletionReq'
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
                        - type: image_url
                          image_url:
                            url: >-
                              https://filecdn.minimax.chat/public/fe9d04da-f60e-444d-a2e0-18ae743add33.jpeg
                  max_completion_tokens: 500
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
                        - type: video_url
                          video_url:
                            url: >-
                              https://filecdn.minimax.chat/public/ee8c1648-21f1-41b7-8397-65022d22ffe5.mp4
                  max_completion_tokens: 500
              Deep Thinking:
                value:
                  model: MiniMax-M3
                  thinking:
                    type: adaptive
                  messages:
                    - role: user
                      content: Which is bigger, 9.11 or 9.9?
                  max_completion_tokens: 500
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
                        - type: image_url
                          image_url:
                            url: >-
                              https://filecdn.minimax.chat/public/fe9d04da-f60e-444d-a2e0-18ae743add33.jpeg
                  stream: true
                  max_completion_tokens: 500
              Tool Use:
                value:
                  model: MiniMax-M3
                  messages:
                    - role: user
                      content: How's the weather in San Francisco?
                  tools:
                    - type: function
                      function:
                        name: get_weather
                        description: Get the current weather for a given location.
                        parameters:
                          type: object
                          properties:
                            location:
                              type: string
                              description: >-
                                The city and state/country, e.g. San Francisco,
                                US
                          required:
                            - location
        required: true
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChatCompletionResp'
              examples:
                Image Understanding:
                  value:
                    id: 066a33a7d290378f8a9e57a055812afa
                    choices:
                      - finish_reason: stop
                        index: 0
                        message:
                          content: >-
                            <think>

                            The user is asking me to describe an image. Let me
                            look at it carefully and provide a description.


                            The image shows a young girl, likely a child, with
                            curly/wavy brown hair that has bangs. She has large
                            brown/amber eyes and is smiling gently. She's
                            wearing what appears to be a cream or off-white
                            dress with lace/ruffled details. The lighting is
                            soft and warm, suggesting this is a portrait-style
                            photograph with a blurred neutral background.

                            </think>

                            This image is a warm, softly-lit portrait photograph
                            of a young girl, likely a child around 4-6 years
                            old. Key features include:


                            - **Hair**: Wavy/curly brown hair with bangs, with
                            some strands pulled back or styled on top

                            - **Eyes**: Large, expressive amber/brown eyes
                            looking directly at the camera

                            - **Expression**: A gentle, sweet smile

                            - **Clothing**: A cream or off-white dress with
                            delicate lace trim and ruffled cap sleeves

                            - **Lighting**: Soft, warm, golden lighting that
                            gives the image a dreamy, classic portrait quality

                            - **Background**: A neutral, muted grayish-brown
                            backdrop, blurred to keep focus on the subject


                            The overall aesthetic resembles a professional
                            studio portrait or a finely-tuned AI-generated
                            image, with attention to detail in features like the
                            catchlights in her eyes, the texture of her hair,
                            and the soft focus on the background. It has a
                            timeless, painterly quality.
                          role: assistant
                          name: MiniMax AI
                          audio_content: ''
                    created: 1780154535
                    model: MiniMax-M3
                    object: chat.completion
                    usage:
                      total_tokens: 1659
                      total_characters: 0
                      prompt_tokens: 1366
                      completion_tokens: 293
                      prompt_tokens_details:
                        cached_tokens: 114
                    input_sensitive: false
                    output_sensitive: false
                    input_sensitive_type: 0
                    output_sensitive_type: 0
                    output_sensitive_int: 0
                    base_resp:
                      status_code: 0
                      status_msg: ''
                Video Understanding:
                  value:
                    id: 066b4564af67dda4130e1db289c2ba25
                    choices:
                      - finish_reason: stop
                        index: 0
                        message:
                          content: >-
                            <think>

                            The user wants me to describe the action in the
                            video.


                            1.  **Analyze the video:**
                                *   The video shows an AI-generated scene (indicated by the "MINIMAX" and "Hailuo AI" watermarks).
                                *   The setting is a large indoor arena, likely an Olympic pool venue, given the Olympic rings logo and the "Lausanne 2020" text (which is anachronistic, but it's a generated video).
                                *   The main subject is a domestic cat, specifically a spotted breed like a Bengal or Savannah, but it looks a bit distorted in the generated style.
                                *   The cat is walking on a diving board. It starts on the left side and walks towards the right.
                                *   Around 0.2 seconds, the cat reaches the end of the diving board and leaps off.
                                *   The cat is airborne for a brief moment, performing what looks like a basic jump, not a complex dive.
                                *   It falls towards the water below.
                                *   It hits the water and splashes.
                                *   The camera follows the cat's trajectory.
                                *   The background shows a crowd of spectators sitting in the stands, watching the event.
                                *   A person is standing on the pool deck, observing.

                            2.  **Synthesize the description:**
                                *   Start with the main subject and action: A cat is walking on a diving board.
                                *   Describe the progression: It walks to the end.
                                *   Describe the climax: It jumps off the board.
                                *   Describe the conclusion: It falls into the water below.
                                *   Keep it concise and objective.

                            3.  **Draft the final sentence:** "A cat is seen
                            walking on a diving board and then jumping into a
                            pool of water." This accurately and concisely
                            captures the entire sequence of events in the video.
                            It covers the initial state (walking), the action
                            (jumping), and the final state (in the pool).

                            </think>

                            A cat is seen walking on a diving board and then
                            jumping into a pool of water.
                          role: assistant
                          name: MiniMax AI
                          audio_content: ''
                    created: 1780224612
                    model: MiniMax-M3
                    object: chat.completion
                    usage:
                      total_tokens: 2672
                      total_characters: 0
                      prompt_tokens: 2245
                      completion_tokens: 427
                      prompt_tokens_details:
                        cached_tokens: 114
                    input_sensitive: false
                    output_sensitive: false
                    input_sensitive_type: 0
                    output_sensitive_type: 0
                    output_sensitive_int: 0
                    base_resp:
                      status_code: 0
                      status_msg: ''
                Deep Thinking:
                  value:
                    id: 066b366b8e8beeafd3b8b49f89e00648
                    choices:
                      - finish_reason: stop
                        index: 0
                        message:
                          content: >-
                            <think>

                            The user is asking which is bigger, 9.11 or 9.9.
                            This is a comparison of two decimal numbers.


                            9.11 vs 9.9


                            Let me think carefully:

                            - 9.11 = 9 + 0.11

                            - 9.9 = 9 + 0.90


                            0.90 > 0.11, so 9.9 > 9.11.


                            Alternatively, I can compare them as if they were
                            both decimals to the same place:

                            - 9.11

                            - 9.90


                            Comparing the tenths place: 1 vs 9. Since 9 > 1, 9.9
                            is bigger.


                            So 9.9 is bigger than 9.11.

                            </think>

                            **9.9 is bigger than 9.11.**


                            It can be tempting to think 9.11 > 9.9 because "11"
                            looks larger than "9," but decimals don't work that
                            way. Here's why:


                            - **9.11** = 9 + **0.11** (eleven hundredths)

                            - **9.9** = 9 + **0.90** (ninety hundredths)


                            Since 0.90 > 0.11, **9.9 is greater**. ✅


                            **Tip:** When comparing decimals, compare them to
                            the same number of decimal places. Write 9.9 as 9.90
                            — now it's easy to see that 9.90 > 9.11.
                          role: assistant
                          name: MiniMax AI
                          audio_content: ''
                    created: 1780220779
                    model: MiniMax-M3
                    object: chat.completion
                    usage:
                      total_tokens: 484
                      total_characters: 0
                      prompt_tokens: 172
                      completion_tokens: 312
                      prompt_tokens_details:
                        cached_tokens: 159
                    input_sensitive: false
                    output_sensitive: false
                    input_sensitive_type: 0
                    output_sensitive_type: 0
                    output_sensitive_int: 0
                    base_resp:
                      status_code: 0
                      status_msg: ''
                Stream:
                  value:
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: |-
                              <think>
                              The user
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: |2-
                               is asking what the image shows. I should describe the image in detail.
                              </think>
                              This image is
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: |2+
                               a close-up portrait of a young girl, likely a toddler or preschool-aged child. Key details include:

                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >-
                              - **Facial expression**: She has a sweet, subtle
                              smile and is looking directly at the camera
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: |2-
                               with large, expressive hazel/light brown eyes.
                              - **Hair**: She has tousled, wavy
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: ' light brown/auburn hair with wispy bangs that frame her face, appearing somewhat wild and'
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >2-
                               natural.
                              - **Clothing**: She's wearing a cream or off-white
                              top with delicate lace or ruff
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >-
                              led detailing around the neckline, giving it a
                              vintage or romantic feel.

                              - **Lighting and mood
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >-
                              **: The photo uses soft, warm lighting that
                              highlights her features and creates a gentle,
                              painter
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >-
                              ly quality. The background is a neutral, muted
                              olive-gray tone, which keeps the focus
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >2-
                               on her face.
                              - **Style**: The overall aesthetic has an
                              artistic, portrait-ph
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >-
                              otography quality, reminiscent of fine art
                              children's portraiture, with shallow depth of
                              field that softly
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - finish_reason: stop
                          index: 0
                          delta:
                            content: >2-
                               blurs the background.

                              The image evokes a sense of innocence, warmth, and
                              charm.
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                Tool Use:
                  value:
                    id: 066b13237d4accbb697b81f696876915
                    choices:
                      - finish_reason: tool_calls
                        index: 0
                        message:
                          content: >
                            <think>

                            The user is asking about the weather in San
                            Francisco. I'll use the get_weather tool to retrieve
                            this information.

                            </think>
                          role: assistant
                          name: MiniMax AI
                          tool_calls:
                            - id: call_function_a1nrtksph4pi_1
                              type: function
                              function:
                                name: get_weather
                                arguments: '{"location": "San Francisco, US"}'
                              index: 0
                          audio_content: ''
                    created: 1780211747
                    model: MiniMax-M3
                    object: chat.completion
                    usage:
                      total_tokens: 473
                      total_characters: 0
                      prompt_tokens: 418
                      completion_tokens: 55
                      prompt_tokens_details:
                        cached_tokens: 114
                    input_sensitive: false
                    output_sensitive: false
                    input_sensitive_type: 0
                    output_sensitive_type: 0
                    output_sensitive_int: 0
                    base_resp:
                      status_code: 0
                      status_msg: ''
            text/event-stream:
              schema:
                $ref: '#/components/schemas/ChatCompletionChunk'
              examples:
                Stream:
                  value:
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: |-
                              <think>
                              The user
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: |2-
                               is asking what the image shows. I should describe the image in detail.
                              </think>
                              This image is
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: |2+
                               a close-up portrait of a young girl, likely a toddler or preschool-aged child. Key details include:

                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >-
                              - **Facial expression**: She has a sweet, subtle
                              smile and is looking directly at the camera
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: |2-
                               with large, expressive hazel/light brown eyes.
                              - **Hair**: She has tousled, wavy
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: ' light brown/auburn hair with wispy bangs that frame her face, appearing somewhat wild and'
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >2-
                               natural.
                              - **Clothing**: She's wearing a cream or off-white
                              top with delicate lace or ruff
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >-
                              led detailing around the neckline, giving it a
                              vintage or romantic feel.

                              - **Lighting and mood
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >-
                              **: The photo uses soft, warm lighting that
                              highlights her features and creates a gentle,
                              painter
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >-
                              ly quality. The background is a neutral, muted
                              olive-gray tone, which keeps the focus
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >2-
                               on her face.
                              - **Style**: The overall aesthetic has an
                              artistic, portrait-ph
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - index: 0
                          delta:
                            content: >-
                              otography quality, reminiscent of fine art
                              children's portraiture, with shallow depth of
                              field that softly
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
                    - id: 066a34c738d29f6687fbf54ab6c98c34
                      choices:
                        - finish_reason: stop
                          index: 0
                          delta:
                            content: >2-
                               blurs the background.

                              The image evokes a sense of innocence, warmth, and
                              charm.
                            role: assistant
                            name: MiniMax AI
                            audio_content: ''
                      created: 1780154823
                      model: MiniMax-M3
                      object: chat.completion.chunk
                      usage: null
                      input_sensitive: false
                      output_sensitive: false
                      input_sensitive_type: 0
                      output_sensitive_type: 0
                      output_sensitive_int: 0
components:
  schemas:
    ChatCompletionReq:
      type: object
      required:
        - model
        - messages
      properties:
        model:
          type: string
          description: Model ID
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
        messages:
          type: array
          description: >-
            A list of messages containing the conversation history. Supports
            text, image, video, and tool call content.
          items:
            $ref: '#/components/schemas/Message'
        thinking:
          type: object
          description: >-
            Controls MiniMax-M3 thinking. When omitted, adaptive thinking is
            enabled by default and responses include thinking content. For M2.x
            models, thinking cannot be disabled.
          properties:
            type:
              type: string
              enum:
                - disabled
                - adaptive
              default: adaptive
              description: >-
                Thinking control type.

                - `disabled`: Skip thinking for MiniMax-M3 and answer directly.
                For M2.x models, thinking remains on.

                - `adaptive`: Enable adaptive thinking for MiniMax-M3. This is
                the default when `thinking` is omitted.
          required: []
        reasoning_split:
          type: boolean
          description: >-
            Output-format switch. When enabled, separates thinking content into
            the `reasoning_content` and `reasoning_details` fields. This does
            not enable or disable thinking.
        stream:
          type: boolean
          description: >-
            Whether to use streaming output, defaults to `false`. When set to
            `true`, the response will be returned in chunks.
          default: false
        stream_options:
          type: object
          description: Streaming response options.
          properties:
            include_usage:
              type: boolean
              default: false
              description: Whether to include token usage in the streaming response.
        max_completion_tokens:
          type: integer
          format: int64
          description: >-
            Specifies the upper limit for generated content length, in tokens.
            For MiniMax-M3 the recommended value is 131072 (128K) and the
            maximum is 524288 (512K); for other models the recommended value is
            65536 (64K) and the maximum is 204800 (200K). If generation stops
            due to `length`, try increasing this value.
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
          description: Tool definition list. Function tools are supported.
          items:
            type: object
            properties:
              type:
                type: string
                enum:
                  - function
                description: Tool type, always function.
              function:
                type: object
                properties:
                  name:
                    type: string
                    description: Function name.
                  description:
                    type: string
                    description: Function description.
                  parameters:
                    type: object
                    description: Function parameters JSON Schema.
                required:
                  - name
                  - parameters
            required:
              - type
              - function
        max_tokens:
          type: integer
          format: int64
          deprecated: true
          description: >-
            Legacy generation length limit parameter. Deprecated; use
            `max_completion_tokens` instead.
          minimum: 1
    ChatCompletionResp:
      type: object
      properties:
        id:
          type: string
          description: Unique ID of this response
        choices:
          type: array
          description: List of response choices
          items:
            type: object
            properties:
              finish_reason:
                type: string
                description: >-
                  Reason for stopping generation: `stop`, `length`,
                  `content_filter`, or `tool_calls`.
                enum:
                  - stop
                  - length
                  - content_filter
                  - tool_calls
              index:
                type: integer
                description: Index of the choice, starting from 0
              message:
                type: object
                description: Complete reply generated by the model
                required:
                  - content
                  - role
                properties:
                  content:
                    type: string
                    description: Text reply content
                  reasoning_content:
                    type: string
                    description: >-
                      Thinking content. Returned only when reasoning_split is
                      enabled.
                  reasoning_details:
                    type: array
                    description: >-
                      Structured thinking content. Returned only when
                      reasoning_split is enabled.
                    items:
                      type: object
                      properties:
                        type:
                          type: string
                          description: Reasoning detail type, for example `reasoning.text`.
                        id:
                          type: string
                          description: Identifier of the reasoning segment.
                        format:
                          type: string
                          description: >-
                            Format identifier of the reasoning content, for
                            example `MiniMax-response-v1`.
                        index:
                          type: integer
                          description: Order index of the reasoning segment.
                        text:
                          type: string
                          description: Thinking text of this segment.
                  role:
                    type: string
                    description: Role, fixed as `assistant`
                    enum:
                      - assistant
                  tool_calls:
                    type: array
                    description: >-
                      Tool calls generated by the model. Returned only when
                      `finish_reason` is `tool_calls`. Echo each entry back as
                      part of the next-turn assistant message and pair it with a
                      `role: tool` message whose `tool_call_id` equals the
                      entry's `id`.
                    items:
                      $ref: '#/components/schemas/ToolCall'
        created:
          type: integer
          format: int64
          description: Unix timestamp (seconds) when the response was created
        model:
          type: string
          description: Model ID used for this request
        object:
          type: string
          description: >-
            Object type. `chat.completion` for non-streaming,
            `chat.completion.chunk` for streaming
          enum:
            - chat.completion
            - chat.completion.chunk
        usage:
          $ref: '#/components/schemas/Usage'
        input_sensitive:
          type: boolean
          description: >-
            Whether the input content triggered sensitive word detection. If the
            input content is severely inappropriate, the API will return a
            content violation error message with empty reply content
        input_sensitive_type:
          type: integer
          format: int64
          description: >-
            Type of sensitive word triggered by input, returned when
            input_sensitive is true. Values: 1 Severe violation; 2 Pornography;
            3 Advertising; 4 Prohibited; 5 Abuse; 6 Violence/Terrorism; 7 Other
        output_sensitive:
          type: boolean
          description: >-
            Whether the output content triggered sensitive word detection. If
            the output content is severely inappropriate, the API will return a
            content violation error message with empty reply content
        output_sensitive_type:
          type: integer
          format: int64
          description: Type of sensitive word triggered by output
        base_resp:
          type: object
          description: Error status code and details
          properties:
            status_code:
              type: integer
              format: int64
              description: >-
                Status code


                - `1000`: Unknown error

                - `1001`: Request timeout

                - `1002`: Rate limit triggered

                - `1004`: Authentication failed

                - `1008`: Insufficient balance

                - `1013`: Internal server error

                - `1027`: Output content error

                - `1039`: Token limit exceeded

                - `2013`: Parameter error


                For more details, see [Error Code
                Reference](/api-reference/errorcode)
            status_msg:
              type: string
              description: Error details
    ChatCompletionChunk:
      type: object
      description: ''
      properties:
        id:
          type: string
          description: Unique ID of this response
        choices:
          type: array
          description: List of streaming response choices
          items:
            type: object
            properties:
              index:
                type: integer
                description: Index of the choice, starting from 0
              delta:
                type: object
                description: Incremental content
                properties:
                  role:
                    type: string
                    description: Role, fixed as `assistant`
                    enum:
                      - assistant
                  content:
                    type: string
                    description: Incremental text content
              finish_reason:
                type: string
                nullable: true
                description: >-
                  Reason for stopping generation, null when not finished: `stop`
                  (natural ending), `length` (reached `max_completion_tokens`
                  limit)
                enum:
                  - stop
                  - length
        created:
          type: integer
          format: int64
          description: Unix timestamp (seconds) when the response was created
        model:
          type: string
          description: Model ID used for this request
        object:
          type: string
          description: Object type, fixed as `chat.completion.chunk`
          enum:
            - chat.completion.chunk
        usage:
          $ref: '#/components/schemas/Usage'
          description: Token usage (only returned in the last chunk)
        input_sensitive_type:
          type: integer
          format: int64
          description: Type of sensitive word triggered by input
        output_sensitive:
          type: boolean
          description: Whether the output content triggered sensitive word detection
        output_sensitive_type:
          type: integer
          format: int64
          description: Type of sensitive word triggered by output
    Message:
      type: object
      required:
        - role
      properties:
        role:
          type: string
          enum:
            - system
            - user
            - assistant
            - tool
          description: Role of the message sender.
        name:
          type: string
          description: >-
            Name of the sender. If there are multiple roles of the same type, a
            specific name must be provided to distinguish them
        content:
          oneOf:
            - type: string
              description: Text message content
            - type: array
              description: >-
                Multimodal message content parts. MiniMax-M3 supports text,
                image, and video input.


                **File size and request limits**

                - URL or Base64 input: video file ≤ 50 MB, image file ≤ 10 MB,
                request body ≤ 64 MB.

                - Files API upload: referenced in `content` as
                `mm_file://{file_id}`, with a single video up to 512 MB.
              items:
                $ref: '#/components/schemas/MessageContentPart'
          description: >-
            Message content. MiniMax-M3 supports text, image, and video content
            parts.
        tool_calls:
          type: array
          description: Tool call list in an assistant message.
          items:
            $ref: '#/components/schemas/ToolCall'
        tool_call_id:
          type: string
          description: >-
            Tool call ID. Required when `role` is `tool`. Set this to the `id`
            of the corresponding entry in the assistant message's `tool_calls`
            so the model can match the tool result with the originating call.
            Ignored for other roles.
    ToolCall:
      type: object
      required:
        - id
        - type
        - function
      description: Tool call generated by the model in an assistant message.
      properties:
        id:
          type: string
          description: Tool call ID, generated by the model.
        type:
          type: string
          enum:
            - function
          description: Tool call type. Currently only `function` is supported.
        function:
          type: object
          required:
            - name
            - arguments
          properties:
            name:
              type: string
              description: Name of the function to call.
            arguments:
              type: string
              description: Function arguments as a JSON-formatted string.
    Usage:
      type: object
      description: Token usage statistics for this request
      properties:
        total_tokens:
          type: integer
          description: Total number of tokens consumed
    MessageContentPart:
      type: object
      required:
        - type
      description: >-
        Multimodal message content part. Each part declares its kind via `type`,
        and only the field matching that type should be populated.
      properties:
        type:
          type: string
          enum:
            - text
            - image_url
            - video_url
          description: |-
            Content part type:
            - `text`: Text part
            - `image_url`: Image input
            - `video_url`: Video input
        text:
          type: string
          description: Text content (when `type` is `text`).
        image_url:
          type: object
          description: >-
            Image input (when `type` is `image_url`). Each image can be up to 10
            MB.


            **Supported image formats**


            | Format | Common extensions | MIME Type |

            | :-- | :-- | :-- |

            | JPEG | .jpg, .jpeg | image/jpeg |

            | PNG | .png | image/png |

            | GIF | .gif | image/gif |

            | WEBP | .webp | image/webp |
          required:
            - url
          properties:
            url:
              type: string
              description: Image URL or Base64 data URL.
            detail:
              type: string
              enum:
                - low
                - default
                - high
              default: default
              description: >-
                Controls image resolution. Defaults to default.


                Rough single-image token usage heuristic:


                | detail | Rough token usage |

                | :-- | :-- |

                | low | Usually a few hundred tokens, up to ~600 |

                | default | Often ~1k-3k tokens, up to ~5k |

                | high | Often several thousand tokens, up to ~15k+ |


                Actual usage depends on image size and content; check response
                usage or token counting where available.
            max_long_side_pixel:
              type: integer
              minimum: 1
              description: Longest-side pixel limit for the image.
        video_url:
          type: object
          description: >-
            Video input (when `type` is `video_url`).


            **Supported video formats**


            | Format | Common extensions | MIME Type |

            | :-- | :-- | :-- |

            | MP4 | .mp4 | video/mp4 |

            | AVI | .avi | video/avi or video/x-msvideo |

            | MOV | .mov | URL input: set the object storage Content-Type to
            video/quicktime; base64 input: use video/mov, i.e.
            data:video/mov;base64,<BASE64_ENCODING> |

            | MKV | .mkv | video/x-matroska |
          required:
            - url
          properties:
            url:
              type: string
              description: >-
                Video URL, Base64 data URL, or Files API reference in the form
                `mm_file://{file_id}`. To obtain a `file_id`, first upload the
                video via the [Upload
                File](/api-reference/file-management-upload) API. URL or Base64
                videos can be up to 50 MB; Files API videos can be up to 512 MB.
            detail:
              type: string
              enum:
                - low
                - default
                - high
              default: default
              description: Controls per-frame video resolution. Defaults to default.
            fps:
              type: number
              minimum: 0.2
              maximum: 5
              default: 1
              description: >-
                Video frame sampling rate. Defaults to 1. Range [0.2, 5].

                - Higher values: more sensitive to scene changes, but higher
                token cost and slower response.

                - Lower values: lower token cost and faster response, but less
                sensitive to scene changes.
            max_long_side_pixel:
              type: integer
              minimum: 1
              description: Longest-side pixel limit for video frames.
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |-
        `HTTP: Bearer Auth`
         - Security Scheme Type: http
         - HTTP Authorization Scheme: Bearer API_key, used for account verification, can be viewed in [Account Management > API Keys](https://platform.minimax.io/user-center/basic-information/interface-key)

````