"use client";

interface ConnectionStatusProps {
  wsStatus:
    | "connecting"
    | "connected"
    | "disconnected"
    | "reconnecting"
    | "error";
  lastError?: string;
  reconnectAttempt: number;
  reconnectCount: number;
  maxReconnectAttempts: number;
}

export default function ConnectionStatus({
  wsStatus,
  lastError,
  reconnectAttempt,
  reconnectCount,
  maxReconnectAttempts,
}: ConnectionStatusProps) {
  // Determine status color
  const getStatusColor = () => {
    switch (wsStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
      case "reconnecting":
        return "bg-yellow-500";
      case "disconnected":
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Determine status text
  const getStatusText = () => {
    switch (wsStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting";
      case "reconnecting":
        return `Reconnecting (${reconnectAttempt}/${maxReconnectAttempts})`;
      case "disconnected":
        return "Disconnected";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="flex items-center p-1 text-xs">
      <div className="flex items-center">
        <div className={`h-2 w-2 rounded-full ${getStatusColor()} mr-1`}></div>
        <span className="text-gray-400">{getStatusText()}</span>
      </div>
    </div>
  );
}
