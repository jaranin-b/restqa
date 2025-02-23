const Global = require("./core/global");
const jestqa = new JestQA(__filename, true);

jest.mock("chalk", () => {
  return {
    redBright: (_) => _,
    yellow: (_) => _,
    bold: {
      blue: (_) => _,
      cyan: (_) => _
    }
  };
});
const Snippet = require("./restqa-snippet");

beforeEach(() => {
  const content = `---
  version: 0.0.1
  metadata:
    code: APP
    name: app
    description: Configuration generated by restqa init
  tests:
    local:
      port: 3010
      command: "npm run dev"
      `.trim();

  const config = jestqa.createTmpFile(content, ".restqa.yml");

  const globalOptions = {
    configFile: config
  };

  const $global = new Global(globalOptions);
  global.restqa = $global;
});

describe("RestQA Snippet", () => {
  test("generate snippet when the snippet interface is async-await, generator, promise, synchronous", () => {
    const options = {
      comment: "This is my test comment",
      generatedExpressions: [
        {
          expressionTemplate: "a reques",
          parameterTypes: [
            {
              name: "string",
              type: String,
              useForSnippets: true,
              preferForRegexpMatch: false
            }
          ]
        }
      ],
      functionName: "Given",
      stepParameterNames: []
    };

    const expectedResult = `
😵 Oooppps! The steps does not exist:
"""
Given a reques
"""

Did you mean:
- Given a request
- Given a request hosted on {string}

---

If the problem persist, please try to check the following:
👉 Check if you don't have any random spaces at the begining, in the middle or at the end of the line.
👉 Check the available steps on your project by using the command: restqa steps given
👉 Get more support by contacting us: https://restqa.io/chat

or...

🚀 Create you own step definition: https://docs.restqa.io

Thank you for using RestQA! 💜`;

    // --- async-await
    let snippet = new Snippet("async-await");
    let result = snippet.build(options);
    expect(result).toEqual(expectedResult);

    // --- callback
    snippet = new Snippet("callback");
    result = snippet.build(options);
    expect(result).toEqual(expectedResult);

    // --- generator
    snippet = new Snippet("generator");
    result = snippet.build(options);
    expect(result).toEqual(expectedResult);

    // --- promise
    snippet = new Snippet("promise");
    result = snippet.build(options);
    expect(result).toEqual(expectedResult);

    // --- synchronous
    snippet = new Snippet("synchronous");
    result = snippet.build(options);
    expect(result).toEqual(expectedResult);
  });

  test("generate snippet multiple failing step definition", () => {
    const options = {
      comment: "This is my test comment",
      generatedExpressions: [
        {
          expressionTemplate: "a reques",
          parameterTypes: [
            {
              name: "string",
              type: String,
              useForSnippets: true,
              preferForRegexpMatch: false
            }
          ]
        },
        {
          expressionTemplate: "the header",
          parameterTypes: [
            {
              name: "string",
              type: String,
              useForSnippets: true,
              preferForRegexpMatch: false
            }
          ]
        }
      ],
      functionName: "Given",
      stepParameterNames: []
    };

    const snippet = new Snippet("async-await");
    const result = snippet.build(options);
    const expectedResult = `
😵 Oooppps! The steps does not exist:
"""
Given a reques
"""

Did you mean:
- Given a request
- Given a request hosted on {string}

---
"""
Given the header
"""

Did you mean:
- Given the headers:
- Given the bearer token {data}
- Given the bearer token {string}
- Given the payload:
- Given the body (form):

---

If the problem persist, please try to check the following:
👉 Check if you don't have any random spaces at the begining, in the middle or at the end of the line.
👉 Check the available steps on your project by using the command: restqa steps given
👉 Get more support by contacting us: https://restqa.io/chat

or...

🚀 Create you own step definition: https://docs.restqa.io

Thank you for using RestQA! 💜`;

    expect(result).toEqual(expectedResult);
  });

  test("generate snippet but no recommendation", () => {
    const options = {
      comment: "This is my test comment",
      generatedExpressions: [
        {
          expressionTemplate: "xxx-yy zzz",
          parameterTypes: [
            {
              name: "string",
              type: String,
              useForSnippets: true,
              preferForRegexpMatch: false
            }
          ]
        }
      ],
      functionName: "Then",
      stepParameterNames: []
    };

    const snippet = new Snippet("async-await");
    const result = snippet.build(options);
    const expectedResult = `
😵 Oooppps! The steps does not exist:
"""
Then xxx-yy zzz
"""


If the problem persist, please try to check the following:
👉 Check if you don't have any random spaces at the begining, in the middle or at the end of the line.
👉 Check the available steps on your project by using the command: restqa steps then
👉 Get more support by contacting us: https://restqa.io/chat

or...

🚀 Create you own step definition: https://docs.restqa.io

Thank you for using RestQA! 💜`;

    expect(result).toEqual(expectedResult);
  });
});
