import { useEffect, useRef } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { motion } from 'framer-motion';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function FitnessGauge({ score = 0, level = 'Beginner', streak = 0 }) {
  const chartRef = useRef(null);
  
  const chartData = {
    datasets: [
      {
        data: [score, 100 - score],
        backgroundColor: [
          'rgba(255, 106, 26, 0.8)',
          'rgba(241, 234, 218, 0.3)'
        ],
        borderColor: [
          'rgba(255, 106, 26, 1)',
          'rgba(241, 234, 218, 0.5)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(255, 106, 26, 0.9)',
          'rgba(241, 234, 218, 0.4)'
        ],
        hoverOffset: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '75%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1500,
      easing: 'easeOutQuart'
    },
    elements: {
      arc: {
        borderRadius: 10,
        borderJoinStyle: 'round'
      }
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-slate-600';
  };

  const getScoreMessage = (score) => {
    if (score >= 80) return 'Excellent! 🎉';
    if (score >= 50) return 'Good progress!';
    return 'Keep going! 💪';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex items-center gap-6"
    >
      <div className="relative w-32 h-32">
        <Doughnut
          ref={chartRef}
          data={chartData}
          options={chartOptions}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className={`text-3xl font-bold font-poppins ${getScoreColor(score)}`}
          >
            {Math.round(score)}
          </motion.span>
          <span className="text-xs text-slate-500">/ 100</span>
        </div>
      </div>
      
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Financial Fitness</p>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-lg font-semibold mt-1 text-slate-800"
        >
          {getScoreMessage(score)}
        </motion.h2>
        <div className="flex gap-2 mt-2">
          <div className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">
            🌱 {level}
          </div>
          <div className="px-2 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-medium">
            🔥 {streak}-day streak
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-xs text-slate-500 mt-2"
        >
          {score >= 50 ? 'You\'re on the right track!' : 'Complete a challenge to start.'}
        </motion.p>
      </div>
    </motion.div>
  );
}