import { Card } from './$schema';
import { getDatabase } from './common';

export function getCardsByAnnotationIds(annotationIds: string[]): Card[] {
    const database = getDatabase();

    if (annotationIds.length === 0) {
        return [];
    }

    const placeholders = annotationIds.map(() => '?').join(',');
    const stmt = database.prepare(`
        SELECT id, annotation_id, position_x, position_y, width, height, created_at, updated_at
        FROM cards
        WHERE annotation_id IN (${placeholders})
    `);

    return stmt.all(annotationIds).map((card: any) => ({
        id: card.id,
        annotationId: card.annotation_id,
        position: card.position_x !== null && card.position_y !== null ? { x: card.position_x, y: card.position_y } : undefined,
        width: card.width !== null ? card.width : undefined,
        height: card.height !== null ? card.height : undefined,
    }));
}

export function createCard(annotationId: string, card: Omit<Card, 'id'>): Card {
    const database = getDatabase();

    const insertStmt = database.prepare(`
        INSERT INTO cards (id, annotation_id, position_x, position_y, width, height, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const cardId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    insertStmt.run(
        cardId,
        annotationId, 
        card.position?.x || 0, 
        card.position?.y || 0, 
        card.width, 
        card.height,
        Date.now(),
        Date.now()
    );

    return {
        id: cardId,
        annotationId,
        position: card.position,
        width: card.width,
        height: card.height,
    }
}

export function updateCard(id: string, updates: Partial<Pick<Card, 'position' | 'width' | 'height'>>): boolean {
    const database = getDatabase();

    const stmt = database.prepare(`
        UPDATE cards
        SET position_x = ?, position_y = ?, width = ?, height = ?, updated_at = ?
        WHERE id = ?
    `);

    const result = stmt.run(
        updates.position?.x || 0,
        updates.position?.y || 0,
        updates.width,
        updates.height,
        Date.now(),
        id
    );

    return result.changes > 0;
}

export function batchUpdateCards(cards: Card[]): { success: boolean; error?: string; details?: string[] } {
    const database = getDatabase();
    
    try {
        const transaction = database.transaction(() => {
            const updateStmt = database.prepare(`
                UPDATE cards
                SET position_x = ?, position_y = ?, width = ?, height = ?, updated_at = ?
                WHERE annotation_id = ?
            `);
            
            const insertStmt = database.prepare(`
                INSERT INTO cards (id, annotation_id, position_x, position_y, width, height, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const errors: string[] = [];
            
            for (const card of cards) {
                try {
                    // 首先验证注释是否存在
                    const annotationExists = database.prepare('SELECT id FROM annotations WHERE id = ?').get(card.annotationId);
                    if (!annotationExists) {
                        console.warn(`Annotation with id ${card.annotationId} does not exist, skipping card`);
                        continue; // 跳过这个卡片，继续处理其他卡片
                    }
                    
                    // 检查卡片是否存在（通过annotation_id查询）
                    const existingCard = database.prepare('SELECT id FROM cards WHERE annotation_id = ?').get(card.annotationId);
                    
                    if (existingCard) {
                        // 更新现有卡片
                        const result = updateStmt.run(
                            card.position?.x || 0,
                            card.position?.y || 0,
                            card.width,
                            card.height,
                            Date.now(),
                            card.annotationId
                        );
                        console.log(`Updated card for annotation ${card.annotationId}, changes: ${result.changes}`);
                    } else {
                        // 插入新卡片
                        const result = insertStmt.run(
                            card.id,
                            card.annotationId,
                            card.position?.x || 0,
                            card.position?.y || 0,
                            card.width,
                            card.height,
                            Date.now(),
                            Date.now()
                        );
                        console.log(`Inserted new card for annotation ${card.annotationId}, changes: ${result.changes}`);
                    }
                } catch (cardError) {
                    const errorMsg = `Failed to process card for annotation ${card.annotationId}: ${cardError instanceof Error ? cardError.message : 'Unknown error'}`;
                    console.error(errorMsg);
                    errors.push(errorMsg);
                }
            }
            
            if (errors.length > 0) {
                console.warn(`Some cards failed to process: ${errors.join('; ')}`);
                // 不要抛出错误，而是继续处理其他卡片
                // 这样可以确保部分成功的情况不会导致整个操作失败
            }
        });
        
        transaction();
        return { success: true };
    } catch (error) {
        console.error('Error in batchUpdateCards:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error instanceof Error && error.message.includes('Some cards failed to process') 
                ? error.message.split('Some cards failed to process: ')[1]?.split('; ') 
                : undefined
        };
    }
}

export function deleteCardsByAnnotationId(annotationId: string): boolean {
    const database = getDatabase();

    const stmt = database.prepare(`
        DELETE FROM cards
        WHERE annotation_id = ?
    `);

    const result = stmt.run(annotationId);

    return result.changes > 0;
}

export function deleteCards(ids: string[]): boolean {
    const database = getDatabase();

    if (ids.length === 0) {
        return true;
    }

    const placeholders = ids.map(() => '?').join(',');
    const stmt = database.prepare(`
        DELETE FROM cards
        WHERE id IN (${placeholders})
    `);

    const result = stmt.run(ids);

    return result.changes > 0;
}