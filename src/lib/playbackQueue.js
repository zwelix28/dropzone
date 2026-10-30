/** Play order for the session. A null order follows the catalog. */
export function orderedQueue(catalog, orderIds) {
  if (!Array.isArray(catalog)) return [];
  if (!Array.isArray(orderIds)) return catalog;
  const byId = new Map(catalog.map((episode) => [episode.id, episode]));
  return orderIds.map((id) => byId.get(id)).filter(Boolean);
}

export function moveQueueIds(ids, fromIndex, toIndex) {
  if (!Array.isArray(ids)) return ids;
  if (fromIndex === toIndex) return ids;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= ids.length || toIndex >= ids.length) return ids;
  const next = ids.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
