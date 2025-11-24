document.addEventListener('DOMContentLoaded', () => {
  // Define a configuration object with explanations for each key
  const swaggerConfiguration = {
    url: '/api/docs/swagger.json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    displayOperationId: false,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    defaultModelRendering: 'example',
    displayRequestDuration: false,
    docExpansion: 'list',
    filter: false,
    maxDisplayedTags: null,
    operationsSorter: 'alpha',
    showExtensions: false,
    showCommonExtensions: false,
    tagsSorter: 'alpha',
    onComplete: () => {
      console.log('Swagger UI is ready');
    },
    persistAuthorization: true,
  };

  // Initialize Swagger UI with the configuration
  window.ui = SwaggerUIBundle({
    ...swaggerConfiguration,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: "StandaloneLayout",
  });
});
