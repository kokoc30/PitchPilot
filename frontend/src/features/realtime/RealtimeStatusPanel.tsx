import { Plug, Send, Unplug } from "lucide-react";
import type { WebsocketStatus } from "../../app/store";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";

type RealtimeStatusPanelProps = {
  status: WebsocketStatus;
  lastMessage: string;
  canPing: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onPing: () => void;
};

function toneForStatus(status: WebsocketStatus) {
  if (status === "connected") return "online" as const;
  if (status === "connecting") return "pending" as const;
  if (status === "error") return "warning" as const;
  return "offline" as const;
}

export function RealtimeStatusPanel({
  status,
  lastMessage,
  canPing,
  onConnect,
  onDisconnect,
  onPing,
}: RealtimeStatusPanelProps) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">WebSocket connection</p>
          <div className="mt-2">
            <StatusBadge label={status} tone={toneForStatus(status)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={status === "connected" || status === "connecting"}
            icon={<Plug className="h-4 w-4" aria-hidden="true" />}
            onClick={onConnect}
            size="sm"
          >
            Connect
          </Button>
          <Button
            disabled={status !== "connected"}
            icon={<Send className="h-4 w-4" aria-hidden="true" />}
            onClick={onPing}
            size="sm"
            variant="secondary"
          >
            Ping
          </Button>
          <Button
            disabled={!canPing}
            icon={<Unplug className="h-4 w-4" aria-hidden="true" />}
            onClick={onDisconnect}
            size="sm"
            variant="ghost"
          >
            Close
          </Button>
        </div>
      </div>
      <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-zinc-800 bg-black/30 p-3 text-xs leading-5 text-zinc-300">
        {lastMessage}
      </pre>
    </Card>
  );
}
