export function normalizePathName(name) {
  return name.replaceAll(/&|\*|\/|:|`|<|>|\?|\\|\|"/g, '_')
}
