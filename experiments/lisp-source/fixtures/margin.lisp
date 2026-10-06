(program margin ((order json)) json
  (let cost (* (get order units) (get order cost)) (let revenue (* (get order units) (get order price)) (record margin (- revenue cost)))))
