DELETE FROM task WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY "storeId", type ORDER BY "createdAt" DESC) as rnum FROM task) t WHERE t.rnum > 1);
