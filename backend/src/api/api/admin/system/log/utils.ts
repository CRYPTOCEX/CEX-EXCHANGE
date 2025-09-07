export const operatorMap = {
  equal: (item, key, value) => item[key] === value,
  notEqual: (item, key, value) => item[key] !== value,
  greaterThan: (item, key, value) => item[key] > value,
  greaterThanOrEqual: (item, key, value) => item[key] >= value,
  lessThan: (item, key, value) => item[key] < value,
  lessThanOrEqual: (item, key, value) => item[key] <= value,
  between: (item, key, value) => item[key] >= value[0] && item[key] <= value[1],
  notBetween: (item, key, value) =>
    item[key] < value[0] || item[key] > value[1],
  like: (item, key, value) => new RegExp(value, "i").test(item[key]),
  notLike: (item, key, value) => !new RegExp(value, "i").test(item[key]),
  startsWith: (item, key, value) => item[key].startsWith(value),
  endsWith: (item, key, value) => item[key].endsWith(value),
  substring: (item, key, value) => item[key].includes(value),
  regexp: (item, key, value) => new RegExp(value).test(item[key]),
  notRegexp: (item, key, value) => !new RegExp(value).test(item[key]),
};
