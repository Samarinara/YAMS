import React, { useState, useEffect } from 'react';
import { RotateCcw, Trophy, Zap, Target, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import './App.css';

const MatrixGame = () => {
  const [size, setSize] = useState(3);
  const [matrix, setMatrix] = useState([]);
  const [originalMatrix, setOriginalMatrix] = useState([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [level, setLevel] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedRow1, setSelectedRow1] = useState(-1);
  const [selectedRow2, setSelectedRow2] = useState(-1);
  const [operation, setOperation] = useState('swap');
  const [multiplier, setMultiplier] = useState('1');
  const [hint, setHint] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [animatingCells, setAnimatingCells] = useState(new Set());
  const [pulsingRows, setPulsingRows] = useState(new Set());
  const [isPulsing, setIsPulsing] = useState(false);

  // Generate random matrix
  const generateMatrix = () => {
    const newMatrix = [];
    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j <= size; j++) { // size + 1 for augmented matrix
        row.push(Math.floor(Math.random() * 19) - 9); // -9 to 9
      }
      newMatrix.push(row);
    }
    
    // Ensure the matrix is solvable by making sure it's not singular
    for (let i = 0; i < size; i++) {
      if (newMatrix[i][i] === 0) {
        newMatrix[i][i] = Math.floor(Math.random() * 5) + 1;
      }
    }
    
    setMatrix(newMatrix.map(row => [...row]));
    setOriginalMatrix(newMatrix.map(row => [...row]));
    setMoves(0);
    setSelectedRow1(-1);
    setSelectedRow2(-1);
    setIsComplete(false);
    setHint('');
    setAnimatingCells(new Set());
    setPulsingRows(new Set());
  };

  const toFraction = (decimal) => {
    const tolerance = 1.0E-6;
    if (Math.abs(decimal - Math.round(decimal)) < tolerance) {
      return String(Math.round(decimal));
    }

    const sign = decimal < 0 ? "-" : "";
    const num = Math.abs(decimal);
    const maxDenominator = 100;

    // Continued fraction method
    let h1 = 1, h2 = 0;
    let k1 = 0, k2 = 1;
    let b = num;

    for (let i = 0; i < 100; i++) { // Limit iterations
      const a = Math.floor(b);
      let temp = h1; h1 = a * h1 + h2; h2 = temp;
      temp = k1; k1 = a * k1 + k2; k2 = temp;

      if (k1 > maxDenominator) {
        return `${sign}${h2}/${k2}`; // Return previous, simpler fraction
      }

      if (Math.abs(num - h1 / k1) < num * tolerance) {
        return `${sign}${h1}/${k1}`;
      }

      b = 1 / (b - a);
      if (isNaN(b)) break;
    }

    return decimal.toFixed(2); // Fallback for complex numbers
  };

  const parseFraction = (str) => {
    str = String(str).trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 2) {
        const numerator = parseFloat(parts[0]);
        const denominator = parseFloat(parts[1]);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          return numerator / denominator;
        }
      }
    }
    const num = parseFloat(str);
    return isNaN(num) ? NaN : num;
  };

  // Check if matrix is in reduced row echelon form
const checkComplete = (mat) => {
    let lastPivotCol = -1;
    let inZeroRows = false;
    const tolerance = 1e-4;

    for (let i = 0; i < size; i++) { // For each row
      const row = mat[i];
      let pivotCol = -1;

      // Find pivot for this row
      for (let j = 0; j < size; j++) {
        if (Math.abs(row[j]) > tolerance) {
          pivotCol = j;
          break;
        }
      }

      if (pivotCol === -1) { // This is a zero row (in the non-augmented part)
        inZeroRows = true;
        continue;
      }

      if (inZeroRows) return false; // Non-zero row found after a zero row
      if (pivotCol <= lastPivotCol) return false; // Pivot is not to the right of the one above
      if (Math.abs(row[pivotCol] - 1) > tolerance) return false; // Pivot is not 1

      // Check if all other elements in pivot column are zero
      for (let k = 0; k < size; k++) {
        if (k !== i && Math.abs(mat[k][pivotCol]) > tolerance) return false;
      }

      lastPivotCol = pivotCol;
    }
    return true;
  };

  // Animate cells that changed with staggered timing
  const animateChangedCells = (oldMatrix, newMatrix) => {
    const changedCells = new Set();
    for (let i = 0; i < size; i++) {
      for (let j = 0; j <= size; j++) {
        if (Math.abs(oldMatrix[i][j] - newMatrix[i][j]) > 0.0001) {
          changedCells.add(`${i}-${j}`);
        }
      }
    }
    setAnimatingCells(changedCells);
    setTimeout(() => setAnimatingCells(new Set()), 800);
  };

  // Perform row operations
  const performOperation = () => {
    if (selectedRow1 === -1) return;
    
    const oldMatrix = matrix.map(row => [...row]);
    const newMatrix = matrix.map(row => [...row]);
    let validOperation = true;
    
    const parsedMultiplier = parseFraction(multiplier);
    if (isNaN(parsedMultiplier)) {
      setHint('Invalid multiplier format. Use a number or a fraction (e.g., 1/2).');
      setTimeout(() => setHint(''), 3000);
      return;
    }

    // Add gentle pulsing animation to affected rows
    const affectedRows = new Set([selectedRow1]);
    if (selectedRow2 !== -1) affectedRows.add(selectedRow2);
    setPulsingRows(affectedRows);
    setTimeout(() => setPulsingRows(new Set()), 500);
    
    switch (operation) {
      case 'swap':
        if (selectedRow2 === -1) return;
        [newMatrix[selectedRow1], newMatrix[selectedRow2]] = 
        [newMatrix[selectedRow2], newMatrix[selectedRow1]];
        break;
        
      case 'multiply':
        if (parsedMultiplier === 0) {
          validOperation = false;
          setHint('Cannot multiply by zero!');
          setTimeout(() => setHint(''), 2000);
          return;
        }
        for (let j = 0; j <= size; j++) {
          newMatrix[selectedRow1][j] *= parsedMultiplier;
        }
        break;
        
      case 'add':
        if (selectedRow2 === -1) return;
        for (let j = 0; j <= size; j++) {
          newMatrix[selectedRow1][j] += parsedMultiplier * newMatrix[selectedRow2][j];
        }
        break;
        
      default:
        return;
    }
    
    if (validOperation) {
      setMatrix(newMatrix);
      setMoves(moves + 1);
      animateChangedCells(oldMatrix, newMatrix);
      
      // Check if complete with smooth delay
      if (checkComplete(newMatrix)) {
        setTimeout(() => {
          setIsComplete(true);
          setShowCelebration(true);
          const bonusScore = Math.max(100 - moves * 5, 20);
          setScore(score + bonusScore);
          setTimeout(() => setShowCelebration(false), 3000);
        }, 900);
      }
      
      // Reset selections with smooth delay for visual feedback
      setTimeout(() => {
        setSelectedRow1(-1);
        setSelectedRow2(-1);
      }, 300);
    }
  };

  // Get next hint
  const getHint = () => {
    const hints = [
      'Start by getting 1\'s on the diagonal',
      'Use row swapping to move non-zero elements to the diagonal',
      'Multiply rows to make diagonal elements equal to 1',
      'Use row addition to make elements below the diagonal zero',
      'Work column by column from left to right'
    ];
    setHint(hints[Math.floor(Math.random() * hints.length)]);
    setTimeout(() => setHint(''), 4000);
  };

  // Initialize
  useEffect(() => {
    generateMatrix();
  }, [size]);

  const nextLevel = () => {
    setLevel(level + 1);
    if (level % 3 === 0 && size < 5) {
      setSize(size + 1);
    }
    generateMatrix();
  };

  const handleNewMatrixClick = () => {
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 500);
    generateMatrix();
  };

  return (
    <div className="matrix-game-container">
      
      {/* Floating particles background */}
      <div className="particles-background">
        {Array.from({length: 20}).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${5 + Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Celebration Animation */}
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-content">
            <div className="celebration-main-emoji">🎉</div>
            <div className="celebration-sparkle celebration-sparkle-1">✨</div>
            <div className="celebration-sparkle celebration-sparkle-2" style={{animationDelay: '0.5s'}}>🌟</div>
            <div className="celebration-sparkle celebration-sparkle-3" style={{animationDelay: '1s'}}>💫</div>
          </div>
          <div className="celebration-text-container">
            <div className="celebration-text">
              <Sparkles className="celebration-text-sparkle" />
              AMAZING! +{Math.max(100 - moves * 5, 20)} points!
              <Sparkles className="celebration-text-sparkle" />
            </div>
          </div>
        </div>
      )}

      <div className="main-content">
        {/* Header */}
        <div className="header">
          <h1 className="title">
            Yet Another Matrix Simulator
          </h1>
          <div className="stats-container">
            <div className="stat-item score">
              <Trophy className="stat-icon animate-gentle-pulse" />
              <span className="stat-value">{score}</span>
            </div>
            <div className="stat-item level">
              <Target className="stat-icon" />
              <span className="stat-value">Level {level}</span>
            </div>
            <div className="stat-item moves">
              <Zap className="stat-icon" />
              <span className="stat-value">{moves} moves</span>
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className="game-board">
          
          {/* Matrix Display */}
          <div className="matrix-display-container">
            <div className="panel matrix-display-panel">
              <h3 className="panel-title matrix-title">
                {size}×{size} Augmented Matrix
                {isComplete && (
                  <span className="solved-text">
                    <CheckCircle className="solved-icon" /> SOLVED!
                  </span>
                )}
              </h3>
              
              <div className="matrix-wrapper">
                <div className={`matrix ${isPulsing ? 'animate-pulse-briefly' : ''}`}>
                  {matrix.map((row, i) => (
                    <div key={i} className={`matrix-row ${pulsingRows.has(i) ? 'animate-gentle-pulse scale-102' : ''}`}>
                      <button
                        onClick={() => setSelectedRow1(selectedRow1 === i ? -1 : i)}
                        className={`row-button ${
                          selectedRow1 === i 
                            ? 'selected' 
                            : ''
                        }`}
                      >
                        R{i+1}
                      </button>
                      
                      {row.map((val, j) => (
                        <div key={j} className="matrix-cell-container">
                          <div className={`matrix-cell ${
                            j === size 
                              ? 'augmented' 
                              : ''
                          } ${
                            selectedRow1 === i ? 'animate-gentle-glow scale-102' : ''
                          } ${
                            animatingCells.has(`${i}-${j}`) ? 'animate-gentle-bounce bg-green-200 border-green-300' : ''
                          }`}>
                            <span className="matrix-cell-value">{toFraction(val)}</span>
                          </div>
                          {j === size - 1 && (
                            <div className="matrix-divider">|</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row Operations Panel */}
          <div className="operations-container">
            <div className="panel operations-panel">
              <h4 className="panel-title operations-title">
                <span className="operations-title-dot"></span>
                Row Operations
              </h4>
              
              <div className="operations-content">
                <div className="radio-group">
                  {['swap', 'multiply', 'add'].map((op, index) => (
                    <label key={op} className="radio-label">
                      <input
                        type="radio"
                        value={op}
                        checked={operation === op}
                        onChange={(e) => setOperation(e.target.value)}
                        className="radio-input"
                      />
                      <span className="radio-custom-input">
                        {operation === op && <div className="radio-custom-input-dot"></div>}
                      </span>
                      <span className={`radio-text ${operation === op ? 'selected' : ''}`}>
                        {op === 'swap' ? 'Swap rows' : op === 'multiply' ? 'Multiply row' : 'Add multiple of row'}
                      </span>
                    </label>
                  ))}
                </div>

                {(operation === 'multiply' || operation === 'add') && (
                  <div className="multiplier-container animate-slideDown">
                    <label className="input-label">Multiplier:</label>
                    <input
                      type="text"
                      value={multiplier}
                      onChange={(e) => setMultiplier(e.target.value)}
                      className="multiplier-input"
                    />
                  </div>
                )}

                {(operation === 'swap' || operation === 'add') && selectedRow1 !== -1 && (
                  <div className="row-selection-container animate-slideDown">
                    <label className="input-label">
                      {operation === 'swap' ? 'Swap with:' : 'Add multiple of:'}
                    </label>
                    <div className="row-selection-grid">
                      {Array.from({length: size}, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedRow2(selectedRow2 === i ? -1 : i)}
                          disabled={i === selectedRow1}
                          className={`row-selection-button ${
                            i === selectedRow1 
                              ? 'disabled'
                              : selectedRow2 === i
                              ? 'selected'
                              : ''
                          }`}
                        >
                          R{i+1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={performOperation}
                  disabled={
                    selectedRow1 === -1 || 
                    ((operation === 'swap' || operation === 'add') && selectedRow2 === -1) ||
                    isComplete
                  }
                  className="perform-operation-button"
                >
                  {isComplete ? 'Matrix Solved!' : 'Perform Operation'}
                </button>
              </div>
            </div>
          </div>

          {/* Additional Controls */}
          <div className="additional-controls-container">
            
            {/* Game Controls */}
            <div className="panel game-controls-panel">
              <div className="game-controls-grid">
                <button
                  onClick={handleNewMatrixClick}
                  className="game-control-button new-matrix"
                >
                  <RotateCcw className="game-control-icon animate-spin-slow" />
                  New Matrix
                </button>
                
                <button
                  onClick={getHint}
                  className="game-control-button get-hint"
                >
                  Get Hint
                </button>
                
                {isComplete && (
                  <button
                    onClick={nextLevel}
                    className="game-control-button next-level"
                  >
                    Next Level
                  </button>
                )}
              </div>
            </div>

            {/* Hint Display */}
            {hint && (
              <div className="hint-display animate-slideDown">
                <div className="hint-content">
                  <span className="hint-icon">💡</span>
                  <div>
                    <strong className="hint-title">Hint:</strong>
                    <div className="mt-1">{hint}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="panel instructions-panel">
              <h4 className="panel-title instructions-title">
                
                How to Play
              </h4>
              <div className="instructions-content">
                <p className="instruction-item">
                  <span className="instruction-dot purple"></span>
                  Click R1, R2, etc. to select rows
                </p>
                <p className="instruction-item">
                  <span className="instruction-dot pink"></span>
                  Use operations to get reduced row echelon form
                </p>
                <p className="instruction-item">
                  <span className="instruction-dot indigo"></span>
                  Goal: 1's on diagonal, 0's elsewhere
                </p>
                <p className="instruction-item">
                  <span className="instruction-dot emerald"></span>
                  Fewer moves = higher score!
                </p>
                <p className="instruction-item">
                  <span className="instruction-dot purple"></span>
                  If the math acts really weird, blame JavaScript and refresh the matrix
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default MatrixGame;