import { motion } from 'framer-motion';

export default function LandingScreen({ onUpload, onBuild }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)' }}
    >
      {/* Logo */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 22 }}
        className="flex items-center gap-3 mb-3"
      >
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
          R
        </div>
        <span className="text-2xl font-bold text-gray-800">Resume Builder AI</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-gray-500 text-sm mb-10"
      >
        Create a job-winning resume in minutes
      </motion.p>

      {/* Cards */}
      <div className="flex flex-col sm:flex-row gap-5 px-6 w-full max-w-xl">
        {/* Upload */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 22 }}
          whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(79,70,229,0.18)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onUpload}
          className="flex-1 bg-white rounded-2xl p-7 flex flex-col items-center gap-3 border border-indigo-100 shadow-md cursor-pointer text-left"
          style={{ outline: 'none' }}
        >
          <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl">
            📂
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-base text-center">Upload Resume</div>
            <div className="text-xs text-gray-400 mt-1 text-center">Import from PDF, DOCX or TXT</div>
          </div>
        </motion.button>

        {/* Divider */}
        <div className="flex sm:flex-col items-center justify-center gap-2">
          <div className="flex-1 sm:w-px sm:h-full w-full h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium px-1">OR</span>
          <div className="flex-1 sm:w-px sm:h-full w-full h-px bg-gray-200" />
        </div>

        {/* Build */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.32, type: 'spring', stiffness: 260, damping: 22 }}
          whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(99,102,241,0.15)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onBuild}
          className="flex-1 bg-white rounded-2xl p-7 flex flex-col items-center gap-3 border border-gray-100 shadow-md cursor-pointer text-left"
          style={{ outline: 'none' }}
        >
          <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center text-2xl">
            ✏️
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-base text-center">Build Manually</div>
            <div className="text-xs text-gray-400 mt-1 text-center">Start with a blank template</div>
          </div>
        </motion.button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="text-xs text-gray-300 mt-10"
      >
        Your data stays in your browser — nothing is uploaded without your consent
      </motion.p>
    </motion.div>
  );
}
