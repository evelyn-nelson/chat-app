package ws

import "fmt"

type Group struct {
	ID      string             `json:"id"`
	Name    string             `json:"name"`
	Clients map[string]*Client `json:"clients"`
}

type Hub struct {
	Groups     map[string]*Group
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan *Message
}

func NewHub() *Hub {
	return &Hub{
		Groups:     make(map[string]*Group),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan *Message, 5),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case cl := <-h.Register:
			if _, ok := h.Groups[cl.GroupID]; ok {
				r := h.Groups[cl.GroupID]
				if _, ok := r.Clients[fmt.Sprintf("%v", cl.User.ID)]; !ok {
					r.Clients[fmt.Sprintf("%v", cl.User.ID)] = cl
				}
			}
		case cl := <-h.Unregister:
			if _, ok := h.Groups[cl.GroupID]; ok {
				r := h.Groups[cl.GroupID]
				if _, ok := r.Clients[fmt.Sprintf("%v", cl.User.ID)]; ok {
					delete(r.Clients, fmt.Sprintf("%v", cl.User.ID))
					close(cl.Message)
				}
			}
		case m := <-h.Broadcast:
			if _, ok := h.Groups[m.GroupID]; ok {
				for _, cl := range h.Groups[m.GroupID].Clients {
					cl.Message <- m
				}
			}
		}
	}
}
