"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Keyboard, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
type OrderType = "CALL" | "PUT";
interface TradingShortcutsProps {
  onPlaceOrder: (type: OrderType) => void;
  onIncreaseAmount: () => void;
  onDecreaseAmount: () => void;
  onQuickAmount: (amount: number) => void;
  darkMode?: boolean;
}
export default function TradingShortcuts({
  onPlaceOrder,
  onIncreaseAmount,
  onDecreaseAmount,
  onQuickAmount,
  darkMode = true,
}: TradingShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Check if component is mounted to prevent SSR issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if not in an input field
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;
      if (e.key === "c" || e.key === "C") {
        onPlaceOrder("CALL");
      } else if (e.key === "p" || e.key === "P") {
        onPlaceOrder("PUT");
      } else if (e.key === "ArrowUp") {
        onIncreaseAmount();
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        onDecreaseAmount();
        e.preventDefault();
      } else if (e.key === "1") {
        onQuickAmount(100);
      } else if (e.key === "2") {
        onQuickAmount(500);
      } else if (e.key === "3") {
        onQuickAmount(1000);
      } else if (e.key === "4") {
        onQuickAmount(2000);
      } else if (e.key === "k" || e.key === "K") {
        setIsOpen(true);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPlaceOrder, onIncreaseAmount, onDecreaseAmount, onQuickAmount, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Theme-based style variables
  const styles = {
    button: darkMode
      ? "bg-black hover:bg-zinc-900 border-zinc-800 text-white"
      : "bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800",
    modal: darkMode
      ? "bg-black border-zinc-800 text-white"
      : "bg-white border-gray-200 text-gray-800",
    card: darkMode
      ? "bg-zinc-900/70 hover:bg-zinc-800/70"
      : "bg-gray-100 hover:bg-gray-200",
    accent: darkMode ? "text-[#00C896]" : "text-green-600",
    callButton: "bg-green-600 text-white",
    putButton: "bg-red-600 text-white",
    keyButton: darkMode ? "bg-black text-white" : "bg-gray-700 text-white",
    keyBadge: darkMode ? "bg-black" : "bg-gray-200 text-gray-700",
    border: darkMode ? "border-zinc-800/70" : "border-gray-200",
    subtitle: darkMode ? "text-gray-300" : "text-gray-500",
    muted: darkMode ? "text-gray-400" : "text-gray-500",
  };
  const renderModal = () => {
    if (!isMounted || !isOpen) return null;
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999]"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Container */}
            <div
              className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
              style={{
                pointerEvents: "none",
              }}
            >
              <motion.div
                ref={popupRef}
                className={`${styles.modal} border rounded-lg shadow-xl p-4 w-[400px] max-h-[90vh] overflow-y-auto`}
                style={{
                  pointerEvents: "auto",
                }}
                initial={{
                  opacity: 0,
                  scale: 0.95,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                }}
                transition={{
                  duration: 0.2,
                }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`font-medium text-lg flex items-center gap-2`}>
                    <Keyboard size={18} className={styles.accent} />
                    Keyboard Shortcuts
                  </h3>
                  <motion.button
                    onClick={() => setIsOpen(false)}
                    className={`${styles.muted} hover:${darkMode ? "text-white" : "text-gray-800"} p-1 rounded-full hover:bg-opacity-50 ${darkMode ? "hover:bg-zinc-800" : "hover:bg-gray-200"}`}
                    whileHover={{
                      scale: 1.1,
                    }}
                    whileTap={{
                      scale: 0.9,
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </motion.button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <motion.div
                    className={`${styles.card} p-3 rounded-md transition-colors`}
                    whileHover={{
                      scale: 1.03,
                      y: -2,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                  >
                    <div className="flex items-center">
                      <div
                        className={`${styles.callButton} w-12 h-12 rounded-md flex items-center justify-center font-bold mr-3 shadow-lg`}
                      >
                        C
                      </div>
                      <div>
                        <div className="font-medium">Place CALL order</div>
                        <div className={`text-xs ${styles.muted} mt-1`}>
                          Buy when price will rise
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className={`${styles.card} p-3 rounded-md transition-colors`}
                    whileHover={{
                      scale: 1.03,
                      y: -2,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                  >
                    <div className="flex items-center">
                      <div
                        className={`${styles.putButton} w-12 h-12 rounded-md flex items-center justify-center font-bold mr-3 shadow-lg`}
                      >
                        P
                      </div>
                      <div>
                        <div className="font-medium">Place PUT order</div>
                        <div className={`text-xs ${styles.muted} mt-1`}>
                          Sell when price will fall
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="mb-5">
                  <h4
                    className={`${styles.subtitle} mb-3 text-sm font-medium flex items-center gap-1.5`}
                  >
                    <span className="w-1.5 h-1.5 bg-[#00C896] rounded-full"></span>
                    Amount Control
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      className={`${styles.card} p-3 rounded-md flex items-center transition-colors`}
                      whileHover={{
                        scale: 1.03,
                        y: -2,
                      }}
                      whileTap={{
                        scale: 0.98,
                      }}
                    >
                      <div
                        className={`${styles.keyButton} w-10 h-10 rounded-md flex items-center justify-center font-bold mr-3 shadow-md`}
                      >
                        <ChevronUp size={20} className={styles.accent} />
                      </div>
                      <div>
                        <div className="font-medium">Increase amount</div>
                        <div className={`text-xs ${styles.muted} mt-1`}>
                          Arrow Up
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      className={`${styles.card} p-3 rounded-md flex items-center transition-colors`}
                      whileHover={{
                        scale: 1.03,
                        y: -2,
                      }}
                      whileTap={{
                        scale: 0.98,
                      }}
                    >
                      <div
                        className={`${styles.keyButton} w-10 h-10 rounded-md flex items-center justify-center font-bold mr-3 shadow-md`}
                      >
                        <ChevronDown size={20} className={styles.accent} />
                      </div>
                      <div>
                        <div className="font-medium">Decrease amount</div>
                        <div className={`text-xs ${styles.muted} mt-1`}>
                          Arrow Down
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                <div>
                  <h4
                    className={`${styles.subtitle} mb-3 text-sm font-medium flex items-center gap-1.5`}
                  >
                    <span className="w-1.5 h-1.5 bg-[#00C896] rounded-full"></span>
                    Quick Amount
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      {
                        key: "1",
                        amount: 100,
                      },
                      {
                        key: "2",
                        amount: 500,
                      },
                      {
                        key: "3",
                        amount: 1000,
                      },
                      {
                        key: "4",
                        amount: 2000,
                      },
                    ].map((item) => {
                      return (
                        <motion.div
                          key={item.key}
                          className={`${styles.card} p-2 rounded-md text-center transition-colors`}
                          whileHover={{
                            scale: 1.05,
                            y: -2,
                          }}
                          whileTap={{
                            scale: 0.95,
                          }}
                          onClick={() => onQuickAmount(item.amount)}
                        >
                          <div
                            className={`${styles.keyButton} w-10 h-10 rounded-md flex items-center justify-center font-bold mx-auto mb-2 shadow-md`}
                          >
                            {item.key}
                          </div>
                          <div className="text-sm font-medium">
                            ${item.amount}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className={`mt-5 pt-4 border-t ${styles.border}`}>
                  <div className={`text-xs ${styles.muted} text-center`}>
                    Press{" "}
                    <kbd
                      className={`px-1.5 py-0.5 ${styles.keyBadge} rounded text-xs`}
                    >
                      K
                    </kbd>{" "}
                    anytime to show this panel or{" "}
                    <kbd
                      className={`px-1.5 py-0.5 ${styles.keyBadge} rounded text-xs`}
                    >
                      Esc
                    </kbd>{" "}
                    to close it
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  };
  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 text-sm ${styles.button} py-2 px-3 rounded-md transition-colors border shadow-sm`}
        title="Keyboard Shortcuts"
        whileHover={{
          scale: 1.03,
        }}
        whileTap={{
          scale: 0.97,
        }}
      >
        <Keyboard size={16} className={styles.accent} />
        <span className="font-medium">Keys</span>
      </motion.button>

      {renderModal()}
    </>
  );
}
