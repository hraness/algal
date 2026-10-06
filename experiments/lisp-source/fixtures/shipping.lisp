(program shipping ((order json)) json
  (let shipping (if (>= (get order total) 50) 0 5) (record shipping shipping)))
