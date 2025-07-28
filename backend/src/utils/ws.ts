// parse params with getParameter
export const parseParams = (routePath, path) => {
  const routeParts = routePath.split("/");
  const pathParts = path.split("/");
  const params = {};

  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(":")) {
      const key = routeParts[i].slice(1);
      params[key] = pathParts[i];
    }
  }

  return params;
};
