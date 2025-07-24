'use client';

interface PredictionDisplayProps {
  prediction: 'yes' | 'no';
  className?: string;
}

<<<<<<< HEAD
const PredictionDisplay = ({
  prediction,
  className,
}: PredictionDisplayProps) => {
  const isYes = prediction.toLowerCase() === 'yes';

  return (
    <div className={`inline-flex items-center ${className || ''}`}>
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${
          isYes
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}
      >
=======
const PredictionDisplay = ({ prediction, className }: PredictionDisplayProps) => {
  const isYes = prediction.toLowerCase() === 'yes';
  
  return (
    <div className={`inline-flex items-center ${className || ''}`}>
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
        isYes 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
>>>>>>> ccf23b0fa0d1f1f7231e6d389147a20779082e92
        {prediction.charAt(0).toUpperCase() + prediction.slice(1)}
      </span>
    </div>
  );
};

<<<<<<< HEAD
export default PredictionDisplay;
=======
export default PredictionDisplay; 
>>>>>>> ccf23b0fa0d1f1f7231e6d389147a20779082e92
