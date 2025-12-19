/**
 * API Logger - Re-export from console module
 * @deprecated Import from "@b/utils/console" instead
 */
export {
  withLogger,
  logged,
  withSubOperation,
  getApiContext,
  logStep,
  logFail,
  type ApiContext,
  type LogContext,
} from "./console/api-logger";
