/** Where "Edit target" on a scorecard row goes: the form of that campaign on Set Targets. */
export function useEditPath() {
  return (row) => (row?.id ? `/targets/set-target/${row.id}` : '/targets/set-target');
}
