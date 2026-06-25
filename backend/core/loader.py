import importlib
import pkgutil
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def load_plugins() -> None:
    plugins_dir = Path(__file__).parent.parent / "plugins"
    
    for category in ["providers", "middleware", "tools"]:
        category_dir = plugins_dir / category
        if not category_dir.exists():
            continue
            
        for _, name, is_pkg in pkgutil.iter_modules([str(category_dir)]):
            if not is_pkg:
                module_name = f"plugins.{category}.{name}"
                try:
                    importlib.import_module(module_name)
                    logger.info(f"Loaded plugin module: {module_name}")
                except Exception as e:
                    logger.error(f"Failed to load plugin {module_name}: {e}")
