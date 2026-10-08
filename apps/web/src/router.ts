import { createRouter, createWebHistory } from "vue-router";
import { denied } from "./notice";
import { useSession } from "./session";
import AccessView from "./views/AccessView.vue";
import BranchFormView from "./views/BranchFormView.vue";
import BranchesView from "./views/BranchesView.vue";
import CollateralsView from "./views/CollateralsView.vue";
import CustomerFormView from "./views/CustomerFormView.vue";
import CustomersView from "./views/CustomersView.vue";
import EodView from "./views/EodView.vue";
import FieldsView from "./views/FieldsView.vue";
import HomeView from "./views/HomeView.vue";
import LedgerView from "./views/LedgerView.vue";
import LoanFormView from "./views/LoanFormView.vue";
import LoansView from "./views/LoansView.vue";
import LoginView from "./views/LoginView.vue";
import ProductFormView from "./views/ProductFormView.vue";
import ProductsView from "./views/ProductsView.vue";
import Shell from "./views/Shell.vue";
import UserFormView from "./views/UserFormView.vue";
import UsersView from "./views/UsersView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: LoginView, meta: { public: true } },
    {
      path: "/",
      component: Shell,
      children: [
        { path: "", component: HomeView },
        { path: "branches", component: BranchesView, meta: { permission: "branch.read" } },
        { path: "branches/new", component: BranchFormView, meta: { permission: "branch.create" } },
        { path: "branches/:id", component: BranchFormView, meta: { permission: "branch.read" } },
        { path: "users", component: UsersView, meta: { permission: "user.read" } },
        { path: "users/new", component: UserFormView, meta: { permission: "user.create" } },
        { path: "users/:id", component: UserFormView, meta: { permission: "user.read" } },
        { path: "customers", component: CustomersView, meta: { permission: "customer.read" } },
        { path: "customers/new", component: CustomerFormView, meta: { permission: "customer.create" } },
        { path: "customers/:id", component: CustomerFormView, meta: { permission: "customer.read" } },
        { path: "products", component: ProductsView, meta: { permission: "product.read" } },
        { path: "products/new", component: ProductFormView, meta: { permission: "product.create" } },
        { path: "products/:id", component: ProductFormView, meta: { permission: "product.read" } },
        { path: "loans", component: LoansView, meta: { permission: "loan.read" } },
        { path: "loans/new", component: LoanFormView, meta: { permission: "loan.create" } },
        { path: "loans/:id", component: LoanFormView, meta: { permission: "loan.read" } },
        { path: "collaterals", component: CollateralsView, meta: { permission: "collateral.read" } },
        { path: "eod", component: EodView, meta: { permission: "eod.read" } },
        { path: "ledger", component: LedgerView, meta: { permission: "ledger.read" } },
        { path: "access", component: AccessView, meta: { permission: "role.read" } },
        { path: "fields", component: FieldsView, meta: { permission: "field.read" } },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const session = useSession();
  if (!session.ready) await session.load();
  if (!to.meta.public && !session.user) return "/login";
  if (to.path === "/login" && session.user) return "/";
  const permission = to.meta.permission;
  if (typeof permission === "string" && !session.can(permission)) {
    denied.value = "Bu səhifəyə icazəniz yoxdur";
    return to.path === "/" ? false : "/";
  }
  return true;
});
