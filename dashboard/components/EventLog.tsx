"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { EventLogEntry } from "@/src/app/types";

interface Props {
  entries: EventLogEntry[];
}

export default function EventLog({ entries }: Props) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] p-6 rounded">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-gray-400 text-sm">Oracle Event Log</h2>
        {entries.length > 0 && (
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm font-mono">
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
                className="flex items-center gap-6 py-1 border-b border-[#21262d]"
              >
                <span className="text-gray-500 w-20 shrink-0">{entry.time}</span>
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
