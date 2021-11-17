const YAML = require("yaml");
const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const Generate = require("./generate");
const logger = require("../utils/logger");
const { getPackageJson } = require("../utils/fs");
const Telemetry = require("../utils/telemetry");
const Locale = require("../locales")();

const WELCOME_API_URL = "https://restqa.io/welcome.json";

async function initialize(program) {
  let answers = {
    name: "app",
    port: 8000,
    description: "Configuration generated by restqa init",
    telemetry: true
  };

  const pkg = getPackageJson();

  if (program.y !== true) {
    const questions = []

    if (!pkg || (pkg && !pkg.name)) {
      questions.push({
        type: "input",
        name: "name",
        default: answers.name,
        message: Locale.get("service.init.questions.name")
      });
    }

    questions.push(...[
      {
        type: "input",
        name: "port",
        message: Locale.get("service.init.questions.port"),
        default: answers.port
      },
      {
        type: "list",
        name: "ci",
        message: Locale.get("service.init.questions.ci"),
        default: false,
        choices: [
          {
            name: "Github Action",
            value: "github-action"
          },
          {
            name: "Gitlab Ci",
            value: "gitlab-ci"
          },
          {
            name: "Bitbucket Pipelines",
            value: "bitbucket-pipeline"
          },
          {
            name: "Circle Ci",
            value: "circle-ci"
          },
          {
            name: "Travis Ci",
            value: "travis"
          },
          {
            name: "Jenkins",
            value: "jenkins"
          },
          new inquirer.Separator(),
          {
            name: Locale.get("service.init.questions.no_ci"),
            value: false
          }
        ]
      },
      {
        type: "confirm",
        name: "telemetry",
        message: Locale.get("service.init.questions.telemetry"),
        default: answers.telemetry
      }
    ]);

    answers = await inquirer.prompt(questions);
  }

  addDefaultAnswers(pkg, answers);

  return initialize.generate(answers);
}

/**
 * 
 * Overwrite answers object with value from package json
 * (as default/fallback values)
 * 
 * @param {object} packageJson 
 * @param {object} answers 
 */
function addDefaultAnswers(packageJson, answers) {
  if (packageJson) {
    if (packageJson.name && !answers.name) {
      answers.name = packageJson.name;
    }

    if (packageJson.description && !answers.description) {
      answers.description = packageJson.description;
    }
  }
}

initialize.generate = async function (options) {
  options.folder = options.folder || process.cwd();

  const {ci, name, port, description, folder, telemetry} = options;

  if (!name) {
    throw new ReferenceError("Please share a project name.");
  }

  if (!description) {
    throw new ReferenceError("Please share a project description.");
  }

  if (!port) {
    throw new ReferenceError("Please share a project port.");
  }

  if (ci) {
    switch (ci) {
      case "github-action": {
        const jsonContent = {
          name: "RestQA - Integration tests",
          on: ["push"],
          jobs: {
            RestQa: {
              "runs-on": "ubuntu-latest",
              steps: [
                {
                  uses: "actions/checkout@v1"
                },
                {
                  uses: "restqa/restqa-action@0.0.1",
                  with: {
                    path: "tests/"
                  }
                },
                {
                  name: "RestQA Report",
                  uses: "actions/upload-artifact@v2",
                  with: {
                    name: "restqa-report",
                    path: "report"
                  }
                }
              ]
            }
          }
        };

        const filename = ".github/workflows/integration-test.yml";
        createRecursiveFolder(filename, folder);
        createYaml(path.resolve(folder, filename), jsonContent);

        logger.success("service.init.success.ci", "Github Action");
        break;
      }
      case "gitlab-ci": {
        const jsonContent = {
          stages: ["e2e test"],
          RestQa: {
            stage: "e2e test",
            image: {
              name: "restqa/restqa"
            },
            script: ["restqa run ."],
            artifacts: {
              paths: ["report"]
            }
          }
        };
        createYaml(path.resolve(folder, ".gitlab-ci.yml"), jsonContent);
        logger.success("service.init.success.ci", "Gitlab CI");
        break;
      }
      case "bitbucket-pipeline": {
        const jsonContent = {
          pipelines: {
            default: [
              {
                step: {
                  image: "restqa/restqa",
                  script: ["restqa run ."],
                  artifacts: ["report/**"]
                }
              }
            ]
          }
        };
        createYaml(
          path.resolve(folder, "bitbucket-pipelines.yml"),
          jsonContent
        );
        logger.success("service.init.success.ci", "Bitbucket Pipeline");
        break;
      }
      case "circle-ci": {
        const jsonContent = {
          version: 2.1,
          jobs: {
            test: {
              docker: [
                {
                  image: "restqa/restqa"
                }
              ],
              steps: [
                "checkout",
                {
                  run: {
                    name: "Run RestQA integration test",
                    command: "restqa run"
                  }
                },
                {
                  store_artifacts: {
                    path: "report"
                  }
                }
              ]
            }
          },
          workflows: {
            version: 2,
            restqa: {
              jobs: ["test"]
            }
          }
        };
        const filename = ".circleci/config.yml";
        createRecursiveFolder(filename, folder);
        createYaml(path.resolve(folder, filename), jsonContent);

        logger.success("service.init.success.ci", "Circle CI");
        break;
      }
      case "travis": {
        const jsonContent = {
          dist: "trusty",
          jobs: {
            include: [
              {
                stage: "test",
                script: "docker run --rm -v $PWD:/app restqa/restqa"
              }
            ]
          }
        };
        const filename = ".travis.yml";
        createRecursiveFolder(filename, folder);
        createYaml(path.resolve(folder, filename), jsonContent);

        logger.success("service.init.success.ci", "Travis CI");
        break;
      }
      case "jenkins": {
        const content = `
 pipeline {
    agent { label 'master' }

    stages {
        stage('RestQA') {
            steps {
                script {
                    sh "ls -lah"
                    sh "docker run -v \${env.WORKSPACE}:/app restqa/restqa"
                    
                    archiveArtifacts artifacts: 'report/'
                }
            }
        }
    }
}`.trim();
        const filename = "Jenkinsfile";
        fs.writeFileSync(path.resolve(folder, filename), content);
        logger.success("service.init.success.ci", "Jenkins");
        break;
      }

      default:
        throw new ReferenceError(
          `The continous integration "${ci}" is not supported by RestQa`
        );
    }
  }

  const _telemetry = new Telemetry();
  _telemetry.toggle(telemetry);

  const restqaConfig = {
    version: "0.0.1",
    metadata: {
      code: name.replace(/[^A-Z0-9]+/gi, "-").toUpperCase(),
      name,
      description
    },
    environments: [
      {
        name: "local",
        default: true,
        plugins: [
          {
            name: "@restqa/restqapi",
            config: {
              url: `http://localhost:${port}`
            }
          }
        ],
        outputs: [
          {
            type: "html",
            enabled: true
          },
          {
            type: "file",
            enabled: true,
            config: {
              path: "restqa-result.json"
            }
          }
        ]
      }
    ]
  };

  const configFilename = path.resolve(folder, ".restqa.yml");
  createYaml(configFilename, restqaConfig);

  logger.success("service.init.success.welcome");

  try {
    const curl = ["curl", WELCOME_API_URL];

    const response = await Generate({print: false}, {args: curl});

    const output = "tests/integration/welcome-restqa.feature";

    createRecursiveFolder(output, folder);

    const content = [
      "Feature: Welcome to the RestQA community",
      "",
      "Scenario: Get the list of useful RestQA resources",
      response
    ];

    fs.writeFileSync(path.resolve(folder, output), content.join("\n"));

    logger.info("service.init.success.sample");
  } catch (err) {
    logger.log("service.init.error.scenario_generation", WELCOME_API_URL);
  }
  logger.log("service.init.success.info");
  return configFilename;
};

function createYaml(filename, jsonContent) {
  const contentYAML = YAML.stringify(jsonContent, null, {
    directivesEndMarker: true
  });
  fs.writeFileSync(filename, contentYAML);
}

function createRecursiveFolder(filename, root) {
  fs.mkdirSync(path.resolve(root, path.dirname(filename)), {recursive: true});
}

module.exports = initialize;
