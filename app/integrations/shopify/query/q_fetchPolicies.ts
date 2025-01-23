export const q_fetchPolicies = `
query getPolicies{
    shop {
        shopPolicies {
            title
            body
        }
    }
}`