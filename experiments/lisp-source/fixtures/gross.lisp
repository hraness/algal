(program gross ((order json)) json
  (let gross (* (get order price) (get order quantity)) (let tax (* gross 0.08) (record gross gross tax tax total (+ gross tax)))))
