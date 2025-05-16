import { FaVolumeUp, FaVolumeMute, FaPause, FaPlay } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useTTS } from '../../context/TTSContext';

const SpeechControl = () => {
  const { isTtsOn, setIsTtsOn, synth } = useTTS();
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleTtsOnOff = () => {
    if (isTtsOn) {
      synth?.cancel();
      setIsTtsOn(false);
      setIsSpeechPaused(false);
    } else {
      setIsTtsOn(true);
    }
  };

  const togglePauseResume = () => {
    if (!synth) return;
    if (!isTtsOn) return;
    if (synth.speaking) {
      if (isSpeechPaused) {
        synth.resume();
        setIsSpeechPaused(false);
      } else {
        synth.pause();
        setIsSpeechPaused(true);
      }
    }
  };

  useEffect(() => {
    if (!synth) return;
    const id = setInterval(() => {
      setIsSpeaking(synth.speaking);
      if (!synth.speaking) setIsSpeechPaused(false);
    }, 300);
    return () => clearInterval(id);
  }, [synth]);

  const getStatusText = () => {
    if (!isTtsOn) return 'Off';
    if (isSpeaking) {
      return isSpeechPaused ? 'Paused' : 'Speaking';
    }
    return 'On';
  };

  return (
    <div className="flex items-center h-12 px-3 py-2 mx-4 rounded-lg bg-green-100 border border-green-300 text-green-800 font-light gap-2 shadow-sm hover:shadow-md transition-all duration-200">

      {/* Toggle Button */}
      <button
        className="flex items-center justify-center w-6 h-6 text-green-700 hover:text-green-900"
        title={isTtsOn ? 'Turn off speech' : 'Turn on speech'}
        onClick={toggleTtsOnOff}
      >
        {isTtsOn ? <FaVolumeUp className="w-4 h-4" /> : <FaVolumeMute className="w-4 h-4" />}
      </button>

      {/* Pause/Resume Button */}
      {isTtsOn && isSpeaking && (
        <button
          className="flex items-center justify-center w-6 h-6 text-green-700 hover:text-green-900"
          title={isSpeechPaused ? 'Resume speech' : 'Pause speech'}
          onClick={togglePauseResume}
        >
          {isSpeechPaused ? <FaPlay className="w-4 h-4" /> : <FaPause className="w-4 h-4" />}
        </button>
      )}

      {/* Status Text */}
      <span className="leading-none">
        {getStatusText()}
      </span>

    </div>
  );
};

export default SpeechControl;
