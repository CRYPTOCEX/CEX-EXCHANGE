import Module from 'module';
import path from 'path';

// Custom module resolver to handle @b and @db aliases
const originalResolveFilename = (Module as any)._resolveFilename;

(Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean) {
  // Handle @b alias
  if (request.startsWith('@b/')) {
    const modulePath = request.replace('@b/', '');
    const possiblePaths = [
      path.join(__dirname, '..', modulePath),
      path.join(__dirname, '..', '..', 'src', modulePath),
      path.join(process.cwd(), 'backend', 'src', modulePath),
      path.join(process.cwd(), 'src', modulePath),
    ];
    
    for (const possiblePath of possiblePaths) {
      try {
        return originalResolveFilename.call(this, possiblePath, parent, isMain);
      } catch (e) {
        // Try next path
      }
    }
  }
  
  // Handle @db alias
  if (request.startsWith('@db/')) {
    const modulePath = request.replace('@db/', '');
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'models', modulePath),
      path.join(process.cwd(), 'backend', 'models', modulePath),
      path.join(process.cwd(), 'models', modulePath),
    ];
    
    for (const possiblePath of possiblePaths) {
      try {
        return originalResolveFilename.call(this, possiblePath, parent, isMain);
      } catch (e) {
        // Try next path
      }
    }
  }
  
  // Default resolution
  return originalResolveFilename.call(this, request, parent, isMain);
};

export default {};