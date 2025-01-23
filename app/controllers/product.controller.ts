import { getStoreAccessToken } from "app/controllers/store.controller";
import { ShopifyService } from "app/integrations/shopify/ShopifyService";
import { DifyService } from "app/integrations/dify/DifyService";
import { getStoreWithDatasets } from "app/controllers/store.controller";
import { DatasetType } from "app/lib/types";
import { convertProductsToText } from "app/controllers/helpers";
import { ICreateDocumentByTextResponse } from "app/integrations/dify/types/DocumentTypes";

// export async function importProducts(storeId: string): Promise<ICreateDocumentByTextResponse> {

//     const accessToken = await getStoreAccessToken(storeId); 
    
//     if (!accessToken) { 
//         throw new Error("Access token not found");
//     }
//     const shopifyService = new ShopifyService(accessToken, storeId);
//     const difyService = new DifyService(accessToken, storeId);

//     const products = await shopifyService.product.fetchAllProducts();

//     if(products.length === 0) {
//         throw new Error("No products found");
//     }

//     const convertProductsText = await convertProductsToText(products, storeId);
//     const createDocumentRequest = await difyService.document.generateHierarchicalDocumentRequest(DatasetType.PRODUCTS, convertProductsText);


//     const datasets = await getStoreWithDatasets(storeId);
//     const productDataset = datasets?.datasets.find(dataset => dataset.type === DatasetType.PRODUCTS);

//     let document: ICreateDocumentByTextResponse;
//     if(productDataset) {
//         document = await difyService.document.createDocumentByText(productDataset.id, createDocumentRequest);
//     }else{
//         const newDataset = await difyService.dataset.createDataset({
//             name: DatasetType.PRODUCTS,
//             description: `${DatasetType.PRODUCTS} dataset`,
//         });
//         document = await difyService.document.createDocumentByText(newDataset.id, createDocumentRequest);
//     }

//     return document;
// }

