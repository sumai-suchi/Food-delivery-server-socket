import { getCollection } from "../config/database.js";
import { calculateTotals, createOrderDocument, generateOrderId, isValidStausTransition } from "../utils/helper.js";

export const orderhandler = (io, socket) => {
  console.log("📦 Order handler initialized for socket:", socket.id);

    // Listen for new orders from clients
    socket.on("placeOrder", (data, callback) => {
      console.log("📥 New order received:", data);

      try{
        // Here you would normally save the order to the database
        console.log(`please order from ${socket.id} with data:`, data);
        const validation=validateorder(data)
        if(!validation.valid){
            return callback({ success: false, message: validation.message });
        }
        const totals=calculateTotals(data.item);
        const orderId=generateOrderId();
        const order=createOrderDocument(data,orderId,totals);
        const ordersCollection=getCollection("orders");
        ordersCollection.insertOne(order)
        .then(result=>{
            console.log("✅ Order saved to database with ID:", result.insertedId);
            callback({ success: true, message: "Order placed successfully", orderId });
        })
        .catch(dbError=>{
            console.error("❌ Database error:", dbError);
            callback({ success: false, message: "Failed to save order" });
        });

        socket.join(`order-${orderId}`);
        socket.join('customers')
        io.to(`admin`).emit("newOrder", { 
            order
        });
           
        callback({ success: true,  order});
        console.log("✅ Order processed successfully for socket:", orderId);
      }
        
        catch(error){
            console.error("❌ Error processing order:", error);
            return callback({ success: false, message: "Failed to place order" });
        }
    });

    //tracker
    socket.on("trackOrder", (data, callback) => {
        

        try{
          const ordersCollection = getCollection("orders");
        const order= ordersCollection.findOne({orderId : data.orderId})
        if(!order){
            return callback({ success: false, message: "Order not found" });
        }

        socket.join(`order-${data.orderId}`);
        callback({ success: true, order })

        }catch(error){
            console.error("❌ Error tracking order:", error);
            return callback({ success: false, message: "Failed to track order" });
        }
    

      });


//cancel order
 
socket.on("cancelOrder", (data, callback) => {
    try{
        const ordersCollection = getCollection("orders");
        const order= ordersCollection.findOne({orderId : data.orderId})
        if(!order){
            return callback({ success: false, message: "Order not found" });
        }
        if(!["pending","confirmed"].includes(order.status)){ //only pending and confirmed orders can be canceled
            return callback({ success: false, message: "Order cannot be canceled" });
        }
        ordersCollection.updateOne (
            {orderId : data.orderId},
            {
                $set : {
                    status : "cancelled", updatedAt : new Date().toISOString()},
                $push : {
                    statusHistory : {
                        status : "cancelled",
                        timestamp : new Date().toISOString(),
                        by : socket.id,
                        note :  data?.reason || "cancelled by customer" 
                    }
                }
            }
        )
        // ordersCollection.deleteOne({orderId : data.orderId})
        // callback({ success: true, message: "Order canceled successfully" })

        io.to(`order-${data.orderId}`).emit("orderCanceled", { 
            orderId : data.orderId
        });
        io.to(`admin`).emit("orderCanceled", {
            orderId : data.orderId, customerName : order.customerName
        })
        callback({ success: true, message: "Order canceled successfully" })
    }catch(error){
        console.error("❌ Error canceling order:", error);
        return callback({ success: false, message: "Failed to cancel order" });
    }
});

// get my orders

socket.on("getMyOrders", (data, callback) => {
    try{
        const ordersCollection = getCollection("orders");
        const orders= ordersCollection.find({customerPhone : data.customerPhone}).sort({createdAt : -1}).limit(20).toArray();
        callback({ success: true, orders })
    }catch(error){
        console.error("❌ Error getting orders:", error);
        return callback({ success: false, message: "Failed to get orders" });
    }
});

// admin events

// admin login

socket.on("adminLogin", (data, callback) => {
    try{
        if(data.password === process.env.ADMIN_PASSWORD){
            socket.isAdmin = true;
            socket.join('admin');
            console.log(`✅ Admin ${socket.id} logged in successfully`);
            callback({ success: true, message: "Admin logged in successfully" });
        }else{
            callback({ success: false, message: "Invalid admin password" });
        }
    }catch(error){
        console.error("❌ Error logging in:", error);
        return callback({ success: false, message: "Failed to log in" });
    }
});

// get all orders for admin

socket.on("getAllOrders", (data, callback) => {
    try{
        if(!socket.isAdmin){
            return callback({ success : false , message : "You are not authorized to get all orders"});
        }
        const ordersCollection = getCollection("orders");
         const filter = data.status ? {status : data.status} : {};
        const orders= ordersCollection.find(filter).sort({createdAt : -1}).limit(20).toArray();
        callback({ success: true, orders })
    }catch(error){
        console.error("❌ Error getting orders:", error);
        return callback({ success: false, message: "Failed to get orders" });
    }
});


socket.on('updateStatus', (data, callback) => {
    try{
        if(!socket.isAdmin){
            return callback({ success : false , message : "You are not authorized to update order status"});
        }
        const ordersCollection = getCollection("orders");
        const order= ordersCollection.findOne({orderId : data.orderId})
        if(!order){
            return callback({ success: false, message: "Order not found" });
        }

        if(!isValidStausTransition(order.status, data.status)){
            return callback({ success: false, message: "Invalid status transition" });
        }
    const result= ordersCollection.findOneAndupdateOne (
            {orderId : data.orderId},
            {
                $set : {
                    status : data.status, updatedAt : new Date().toISOString()},
                $push : {
                    statusHistory : {
                        status : data.status,
                        timestamp : new Date().toISOString(),
                        by : socket.id,
                        note :  data?.reason || "updated by admin" 
                    }
                }
            },
            {
                returnDocument : "after"
            }
        )
        io.to(`order-${data.orderId}`).emit("statusUpdated", {
            orderId : data.orderId,
            status : data.status,
            order : result
        })

        socket.to(`admin`).emit("orderStatusChanged", {
            orderId : data.orderId,
            status : data.status
        })
        callback({ success: true, message: "Order status updated successfully" })
    }catch(error){
        console.error("❌ Error updating order status:", error);
        return callback({ success: false, message: "Failed to update order status" });
    }
});
};

