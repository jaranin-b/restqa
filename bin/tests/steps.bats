#!/usr/bin/env bats

load 'common.sh'

## Help

@test "[STEPS]> Get help detail" {
  run restqa steps --help
  assert_success
  [ "${lines[0]}" =  "Usage: restqa steps|st [options] [keyword]" ]
  [ "${lines[1]}" =  "Get the list of step by keyword : given | when | then" ]
  [ "${lines[3]}" =  "  -c, --config <config>  Use a specific .restqa.yml file" ]
  [ "${lines[4]}" =  "  -e, --env <env>        Define the current environment" ]
  [ "${lines[5]}" =  "  -t, --tag <tag>        Filter the step definition by tag" ]
  [ "${lines[6]}" =  "  -h, --help             display help for command" ]
}

MAINDIR="$BATS_TMPDIR/restqa-bats-tests"
WORKDIR="$MAINDIR/steps"

setup_file() {
  echo "--> Installing the npm package @restqa/restqkube into the $MAINDIR folder" >&3
  npm install @restqa/restqkube --prefix $MAINDIR
}

setup() {
  mkdir -p $WORKDIR
  cp -r "$MAINDIR/node_modules" "$WORKDIR/"
}

teardown() {
  rm -rf $WORKDIR
}

## Validation

@test "[STEPS]> Get an error if the keyword is not passed" {
  run restqa steps
  assert_failure
  assert_output --partial 'TypeError: Provide a keyword. Available: given | when | then'
}

@test "[STEPS]> Get an error if the .restqa.yml is not found" {
  run restqa steps given
  assert_failure
  assert_output --partial ">  ReferenceError: The configuration file \""$PWD"/.restqa.yml\" doesn't exist."
}

@test "[STEPS]> Get an error if the keyword doesn't exist" {
  run restqa st Sachant
  assert_failure
  assert_output --partial 'TypeError: "Sachant" is not a valid argument. Available: given | when | then'
}

@test "[STEPS]> Get Error if the passed environemt doesn't exist (using the alias st)" {
  run restqa st -c ./bin/tests/features/success/.restqa.yml -e prod given
  assert_failure
  assert_output --partial ">  Error: \"prod\" is not an environment available in the config file, choose between : local"
}

@test "[STEPS]> Retrieve the steps successfully" {
  cp ./bin/tests/features/success/.restqa.yml "$WORKDIR/.restqa.-success.yml"
  cd $WORKDIR
  run restqa steps -c "$WORKDIR/.restqa.-success.yml" given
  assert_success
  assert_output --partial 'The selected environment is: "local"'
  assert_output --partial 'Plugin'
  assert_output --partial 'Keyword'
  assert_output --partial 'Step'
  assert_output --partial 'Comment'
  assert_output --partial '@restqa/restqapi'
  assert_output --partial 'given'
  assert_output --partial 'I have the api gateway'
  assert_output --partial 'Create a new api request targeting the default api gateway'
}

@test "[STEPS]> Successfull multi-plugin" {
  cp ./bin/tests/features/success/.restqa-plugin-restqkube.yml "$WORKDIR/.restqa.-success-restqkube.yml"
  cd $WORKDIR
  run restqa steps -c "$WORKDIR/.restqa.-success-restqkube.yml" given
  assert_success
  assert_output --partial 'The selected environment is: "local"'
  assert_output --partial 'Plugin'
  assert_output --partial 'Keyword'
  assert_output --partial 'Step'
  assert_output --partial 'Comment'
  assert_output --partial '@restqa/restqapi'
  assert_output --partial 'given'
  assert_output --partial 'I have the api gateway'
  assert_output --partial 'Create a new api request targeting the default api gateway'
  assert_output --partial '@restqa/restqkube'
  assert_output --partial 'given'
  assert_output --partial 'I have my cluster'
  assert_output --partial 'Create a cluster instance'
}

@test "[STEPS]> Successfull multi-plugin but filter per tag" {
  cp ./bin/tests/features/success/.restqa-plugin-restqkube.yml "$WORKDIR/.restqa.-success-restqkube.yml"
  cd $WORKDIR
  run restqa steps -c "$WORKDIR/.restqa.-success-restqkube.yml" given -t url
  assert_success
  assert_output --partial 'The selected environment is: "local"'
  assert_output --partial 'Plugin'
  assert_output --partial 'Keyword'
  assert_output --partial 'Step'
  assert_output --partial 'Comment'
  assert_output --partial '@restqa/restqapi'
  assert_output --partial 'given'
  assert_output --partial 'I have the api gateway'
  assert_output --partial 'Create a new api request targeting the default api gateway'
  refute_output --partial '@restqa/restqkube'
  refute_output --partial 'I have my cluster'
  refute_output --partial 'Create a cluster instance'
  assert_line --index 5 --partial 'I have the api gateway hosted on {string}'
  assert_line --index 6 --partial '══════'
}
