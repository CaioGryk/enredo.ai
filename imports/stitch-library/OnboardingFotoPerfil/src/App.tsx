/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import Splash from "./components/Splash";
import ProfileSetup from "./components/ProfileSetup";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  return (
    <div className="bg-background min-h-screen text-on-surface">
      <AnimatePresence mode="wait">
        {!showProfileSetup ? (
          <motion.div
            key="splash"
             exit={{ opacity: 0, scale: 1.1 }}
             transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <Splash onComplete={() => setShowProfileSetup(true)} />
          </motion.div>
        ) : (
          <motion.div
            key="profile"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <ProfileSetup />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
