export const validateorder=(data)=>{
    if(!data || typeof data !== 'object'){
        throw new Error("Invalid order data: Data must be an object");
    }
    
    if(!data.CustomerName.trim()){
        return {
            valid : false, message : "Customer name is required"
        }
    }
    if(!data.CustomerPhonenumber.trim()){
        return {
            valid : false, message : "Customer phone number is required"
        }
    }
      if(!data.CustomerAddress.trim()){
        return {
            valid : false, message : "Customer address is required"
        }
    }
   
    if(!data.item || !Array.isArray(data.item) || data.item.length === 0){
        return {
            valid : false, message : "Order items are required"
        }
    }
    return {
        valid : true, message : "Order is valid"
    }

}

export function generateOrderId(){{
    const now =new Date();
    console.log(now)
    const year =now.getFullYear()
    console.log(year)
    const month = String(now.getMonth() + 1).padStart(2,'0');
    const day= String(now.getDate()).padStart(2,"0");
    const n= Math.floor(Math.random() * 1000);
    
    return `ORD-${year}${month}${day}-${n}`;
}}


export function calculateTotals(items){
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.08; // Assuming 8% tax rate
      const deliveryFee=150;
    const total = subtotal + tax + deliveryFee;
  
     return {
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        deliveryFee,
        totalAmount: Math.round(total * 100) / 100
     }
}


export function createOrderDocument(orderData,orderId, totals){

   customerPhone : orderData.CustomerPhonenumber.trim();
   customerAdress:orderData.CustomerAddress.trim();
   items: orderData.item;
   subtotal: totals.subtotal;
    tax: totals.tax;
    deliveryFee: totals.deliveryFee;
    totalAmount: totals.totalAmount;
    specialNotes: orderData.specialNotes ? orderData.specialNotes.trim() : '';
    paymentMethod : orderData.paymentMethod ? orderData.paymentMethod.trim() : 'Cash on Delivery';
   paymentStatus : orderData.paymentStatus ? orderData.paymentStatus.trim() : 'Pending';
   status : 'Pending';
   statusHistory : {
    staus : 'Pending';
    timestamp : new Date().toISOString();
    by : 'System';
    note : 'Order created'
   }
   createdAt : new Date().toISOString();
   updatedAt : new Date().toISOString();

   return {
    orderId,
    customerPhone,
    customerAdress,
    items,
    subtotal,
    tax,
    deliveryFee,
    totalAmount,
    specialNotes,
    paymentMethod,
    paymentStatus,
    status,
    statusHistory,
    createdAt,
    updatedAt
   }

}

export function isValidStausTransition(currentStatus, newStatus){
    const validTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['delivered', 'cancelled'],
        'delivered': [],
        'cancelled': []
    };

    return validTransitions[currentStatus].includes(newStatus) || false;
    }
