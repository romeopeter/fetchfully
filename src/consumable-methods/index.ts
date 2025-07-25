import { createGetMethod } from "./get";
import { createPostMethod } from "./post";
import { createPutMethod } from "./put";
import { createPatchMethod } from "./patch";
import { createDeleteMethod } from "./delete";
import { FetchfullyInstance } from "../types";

/* ----------------------------------------------------------------- */

/**
 * Attaches consumable HTTP action methods for fast request
 * 
 * @param instance FetchfullyInstance
 */
export function attachActionMethods(instance: FetchfullyInstance) {
  instance.get = createGetMethod(instance);
  instance.post = createPostMethod(instance);
  instance.put = createPutMethod(instance);
  instance.patch = createPatchMethod(instance);
  instance.delete = createDeleteMethod(instance);

  return instance
}