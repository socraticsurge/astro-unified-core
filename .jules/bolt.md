## 2024-05-15 - React.memo on complex view components
**Learning:** `DashaflowView` is a massive component (1000+ lines) that gets re-rendered frequently by its parent `ProfessionalView` due to prop changes or tab switching. However, its inputs (`output`, `explainers`) are generally static once loaded. Wrapping it in `React.memo` will prevent expensive re-renders and virtual DOM diffing of this huge component.
**Action:** When a large, complex component receives primarily static data but is rendered inside a dynamic parent, wrap the component in `memo` to avoid unnecessary work.
