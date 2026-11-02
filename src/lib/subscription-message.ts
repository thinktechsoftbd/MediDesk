// What MediDesk says while the ThinkTech ERP subscription is not active: on the popup that blocks the
// app, and as the error of every add/edit/delete request (src/middleware.ts). No server-only imports:
// it runs in the middleware and in the browser too.
export function subscriptionInactiveMessage(reason: string | null | undefined) {
    return `Your MediDesk subscription is not active. ${reason ? `${reason} ` : ""}Contact ThinkTech to renew it.`;
}
