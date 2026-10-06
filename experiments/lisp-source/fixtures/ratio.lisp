(program ratio ((order json)) json
  (let weighted (+ (* (get order a) 2) (* (get order b) 3)) (record weighted weighted)))
