// Git exports repository-local variables to hooks. Child Git commands that
// intentionally target another cwd must not inherit those bindings.
const LOCAL_GIT_ENV_KEYS = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CONFIG',
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT',
  'GIT_OBJECT_DIRECTORY',
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_IMPLICIT_WORK_TREE',
  'GIT_GRAFT_FILE',
  'GIT_INDEX_FILE',
  'GIT_NO_REPLACE_OBJECTS',
  'GIT_REPLACE_REF_BASE',
  'GIT_PREFIX',
  'GIT_SHALLOW_FILE',
  'GIT_COMMON_DIR',
];

export function withoutLocalGitEnv(source = process.env) {
  const clean = { ...source };
  for (const key of LOCAL_GIT_ENV_KEYS) delete clean[key];
  return clean;
}
