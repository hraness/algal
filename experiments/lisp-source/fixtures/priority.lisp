(program priority ((order json)) json
  (let urgent (>= (get order score) 90) (let tier (if urgent 1 2) (record tier tier))))
