(program clamp ((order json)) json
  (let base (if (< (get order amount) 0) 0 (get order amount)) (record amount base)))
