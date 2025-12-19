/**
 * Apply DOM patches to handle Google Translate and other third-party tools
 * that manipulate the DOM and may cause "removeChild" or "insertBefore" errors.
 *
 * This prevents errors like:
 * "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."
 */
export default function applyGoogleTranslateDOMPatch() {
  if (typeof Node === "function" && Node.prototype) {
    const originalRemoveChild = Node.prototype.removeChild;

    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            "Google Translate or third-party tool attempted to remove a child node from the wrong parent. Skipping.",
            {
              childNode: (child as any)?.nodeName,
              expectedParent: (this as any)?.nodeName,
              actualParent: (child.parentNode as any)?.nodeName,
            }
          );
        }
        return child;
      }

      return originalRemoveChild.call(this, child);
    };

    const originalInsertBefore = Node.prototype.insertBefore;

    Node.prototype.insertBefore = function <T extends Node>(
      newNode: T,
      referenceNode: Node | null
    ): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            "Google Translate or third-party tool attempted to insert before a reference node from the wrong parent. Skipping.",
            {
              newNode: (newNode as any)?.nodeName,
              expectedParent: (this as any)?.nodeName,
              actualParent: (referenceNode.parentNode as any)?.nodeName,
            }
          );
        }
        return newNode;
      }

      return originalInsertBefore.call(this, newNode, referenceNode);
    };
  }
}
