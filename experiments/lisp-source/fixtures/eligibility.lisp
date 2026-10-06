(program eligibility ((order json)) json
  (let eligible (>= (get order score) 80) (record eligible eligible)))
