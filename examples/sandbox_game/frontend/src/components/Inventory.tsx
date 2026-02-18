import type { GameSession } from '../lib/types';
import { MATERIAL_NAMES, MATERIAL_ICONS, TOOL_NAMES, TOOL_ICONS, RECIPES } from '../constants';
import { useGameActions } from '../hooks/useGameActions';
import { useGameStore } from '../stores/gameStore';

interface Props {
    session: GameSession;
}

export default function Inventory({ session }: Props) {
    const { craftTool } = useGameActions();
    const isLoading = useGameStore((s) => s.isLoading);

    function canCraft(recipe: typeof RECIPES[0]): boolean {
        return recipe.materials.every((need, i) => session.inventory[i] >= need);
    }

    async function handleCraft(recipeId: number) {
        try {
            await craftTool(recipeId);
        } catch (err) {
            console.error('Craft failed:', err);
        }
    }

    return (
        <div className="inventory-panel">
            {/* Tool */}
            <div className="inv-section">
                <h3 className="inv-title">🔧 Tool</h3>
                <div className="tool-info">
                    <span className="tool-icon">{TOOL_ICONS[session.toolTier]}</span>
                    <span className="tool-name">{TOOL_NAMES[session.toolTier]}</span>
                    {session.toolTier > 0 && (
                        <span className="tool-durability">
                            ❤️ {session.toolDurability}
                        </span>
                    )}
                </div>
            </div>

            {/* Materials */}
            <div className="inv-section">
                <h3 className="inv-title">📦 Materials</h3>
                <div className="materials-grid">
                    {session.inventory.map((count, i) => (
                        <div key={i} className={`material-slot ${count > 0 ? 'has-items' : ''}`}>
                            <span className="mat-icon">{MATERIAL_ICONS[i]}</span>
                            <span className="mat-name">{MATERIAL_NAMES[i]}</span>
                            <span className="mat-count">×{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Crafting */}
            <div className="inv-section">
                <h3 className="inv-title">⚒️ Craft</h3>
                <div className="recipes">
                    {RECIPES.map((recipe) => (
                        <button
                            key={recipe.id}
                            className={`recipe-btn ${canCraft(recipe) ? 'craftable' : 'locked'}`}
                            onClick={() => handleCraft(recipe.id)}
                            disabled={!canCraft(recipe) || isLoading}
                            title={recipe.cost}
                        >
                            <span className="recipe-icon">{recipe.icon}</span>
                            <span className="recipe-name">{recipe.name}</span>
                            <span className="recipe-cost">{recipe.cost}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="inv-section">
                <h3 className="inv-title">📊 Stats</h3>
                <div className="stats-list">
                    <span>⛏ Mined: {session.blocksMined}</span>
                    <span>🧱 Placed: {session.blocksPlaced}</span>
                    <span>🔧 Crafted: {session.itemsCrafted}</span>
                </div>
            </div>
        </div>
    );
}
