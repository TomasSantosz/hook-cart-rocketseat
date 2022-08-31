import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  
  const [cart, setCart] = useState<Product[]>(() => {
  
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  

  const addProduct = async (productId: number) => {
    try {
      const updateCart = [...cart];
      //verifica se o produto existe no cart
      const productExist = await cart.find(product => product.id === productId)
     
      //se tiver no estoque adiciona a quantidade que tem , se n 0;
      const currentAmount = productExist ? productExist.amount : 0;
      //adiciona +1 ao valor carrinho
      const amount = currentAmount + 1;
      
      const verifyStockItem = await api.get(`/stock/${productId}`);
      
      if(amount > verifyStockItem.data.amount){
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      //se o produto existe no cart, recebe a quantidade do amount
      if(productExist){
        productExist.amount = amount;
      }else{
        const { data: product} = await api.get<Product>(
          `products/${productId}`,
        );

        const newProduct = {
          ...product,
          amount: 1,
        }
        updateCart.push(newProduct);
      }
      
      setCart(updateCart);
      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(updateCart)
    );
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      
      const updatedCart = [...cart];
      const indexProduct = updatedCart.findIndex(
        (cartItem) => cartItem.id === productId,
      );

      if (indexProduct >= 0) {
        updatedCart.splice(indexProduct, 1);
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId,
      );

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        toast.error("Quantidade solicitada fora de estoque");
        throw new Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
