
import { AnimatePresence, motion } from "framer-motion";
import type { EventLogEntry } from "@/src/app/types";

interface Props {
  entries: EventLogEntry[];
}

export default function EventLog({ entries }: Props) {
  return (
    <div className="bg-card border border-border p-6 rounded">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-muted-foreground text-sm">Oracle Event Log</h2>
        {entries.length > 0 && (
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm font-mono">
          Waiting for new oracle rounds...
        </p>
      ) : (
        <ul className="space-y-1 max-h-52 overflow-y-auto font-mono text-sm">
          <AnimatePresence initial={false}>
            {entries.map(entry => (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-6 py-1 border-b border-border"
              >
                <span className="text-muted-foreground w-20 shrink-0">{entry.time}</span>
                <span className="text-blue-400">Round {entry.roundId}</span>
                <span className="text-green-400">{entry.price}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
