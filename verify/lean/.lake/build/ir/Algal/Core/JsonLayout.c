// Lean compiler output
// Module: Algal.Core.JsonLayout
// Imports: public import Init public meta import Init public import Algal.Core.JsonString public import Algal.Core.Normalize
#include <lean/lean.h>
#if defined(__clang__)
#pragma clang diagnostic ignored "-Wunused-parameter"
#pragma clang diagnostic ignored "-Wunused-label"
#elif defined(__GNUC__) && !defined(__CLANG__)
#pragma GCC diagnostic ignored "-Wunused-parameter"
#pragma GCC diagnostic ignored "-Wunused-label"
#pragma GCC diagnostic ignored "-Wunused-but-set-variable"
#endif
#ifdef __cplusplus
extern "C" {
#endif
lean_object* lp_algalVerification_Algal_Core_JsonString_quoteChars(lean_object*);
lean_object* l_List_appendTR___redArg(lean_object*, lean_object*);
lean_object* lean_string_mk(lean_object*);
lean_object* lean_string_to_utf8(lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* lean_nat_sub(lean_object*, lean_object*);
uint8_t lean_string_validate_utf8(lean_object*);
lean_object* lean_string_from_utf8_unchecked(lean_object*);
lean_object* lean_string_data(lean_object*);
lean_object* l_List_lengthTR___redArg(lean_object*);
uint8_t lean_uint32_dec_eq(uint32_t, uint32_t);
lean_object* lean_uint32_to_nat(uint32_t);
lean_object* lp_algalVerification_Algal_Core_JsonString_readQuoted(lean_object*);
lean_object* l_instDecidableEqChar___boxed(lean_object*, lean_object*);
lean_object* l_List_head_x3f___redArg(lean_object*);
uint8_t l_Option_instDecidableEq___redArg(lean_object*, lean_object*, lean_object*);
uint8_t l_List_instDecidableEqNil___redArg(lean_object*);
lean_object* lp_algalVerification_Algal_Core_Json_encode(lean_object*);
lean_object* lp_algalVerification_Algal_Core_Normalize_normalize(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_JsonLayout_numericHead(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_numericHead___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_renderItems___boxed__const__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__2;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__3_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__3;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__4___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__4_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__4;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__5___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__5_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__5;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__6_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__6;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__7_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__7;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__8_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__8;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__9_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__9;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__10_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__10;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__11_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__11;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___boxed__const__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__12___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__12_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__12;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_renderFields___boxed__const__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_renderFields(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___boxed__const__2;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__13___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_render___closed__13_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_render___closed__13;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_renderItems(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_weightItems(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_weightFields(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_weight(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_weight___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_weightFields___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_weightItems___boxed(lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_readItems___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_readItems___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonLayout_readFields___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonLayout_readFields___closed__0;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readFields(lean_object*, lean_object*, uint8_t, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_readValue___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 1}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(1, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_readValue___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_readValue___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readValue(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readItems(lean_object*, lean_object*, uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readItems___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readFields___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readValue___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_numericHead_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_numericHead_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_render_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_render_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_weight_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_weight_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__4_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__4_splitter___redArg___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__4_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__4_splitter___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_AllItems_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_AllItems_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_renderItems_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_renderItems_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__7_splitter___redArg(lean_object*, uint8_t, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__7_splitter___redArg___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__7_splitter(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__7_splitter___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__5_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__5_splitter(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__3_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__3_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__1_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__1_splitter(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_Following_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_Following_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Option_bind_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Option_bind_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_AllFields_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_AllFields_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_renderFields_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_renderFields_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__7_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__7_splitter(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__5_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__5_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__3_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__3_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__1_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__1_splitter(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readWhole(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_renderBytes(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readBytes(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_bytesToTokens(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___lam__0(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___lam__0___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___lam__1(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___lam__1___boxed(lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___lam__0___boxed, .m_arity = 1, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___closed__0_value;
static const lean_closure_object lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___lam__1___boxed, .m_arity = 1, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___closed__2_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___closed__2_value;
static const lean_string_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 10, .m_capacity = 10, .m_length = 9, .m_data = "__proto__"};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 11, .m_capacity = 11, .m_length = 7, .m_data = "\"},[\\😀\n"};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__3_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_readValue___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__3_value)}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__2_value),((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 4}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__5_value)}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__6_value;
static const lean_string_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = "x"};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__7_value;
static const lean_string_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "first"};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__9_value;
static const lean_string_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "last"};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__10_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__10_value)}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__11_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__12_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 0, .m_other = 3, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__7_value),((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__11_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__12 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__12_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__13_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 0, .m_other = 3, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__7_value),((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__9_value),((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__12_value)}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__13 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__13_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__14_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 0, .m_other = 3, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__6_value),((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__13_value)}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__14 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__14_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__15_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__14_value)}};
static const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__15 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__15_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree = (const lean_object*)&lp_algalVerification_Algal_Core_JsonLayout_nestedStringTree___closed__15_value;
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_AllNumbers_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_AllNumbers_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_canonicalBytes(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readCanonicalBytes(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_JsonLayout_numericHead(lean_object* v_input_1_){
_start:
{
if (lean_obj_tag(v_input_1_) == 0)
{
uint8_t v___x_2_; 
v___x_2_ = 0;
return v___x_2_;
}
else
{
lean_object* v_head_3_; uint32_t v___x_4_; uint32_t v___x_5_; uint8_t v___x_6_; 
v_head_3_ = lean_ctor_get(v_input_1_, 0);
v___x_4_ = 45;
v___x_5_ = lean_unbox_uint32(v_head_3_);
v___x_6_ = lean_uint32_dec_eq(v___x_5_, v___x_4_);
if (v___x_6_ == 0)
{
lean_object* v___x_7_; uint32_t v___x_8_; lean_object* v___x_9_; uint8_t v___x_10_; 
v___x_7_ = lean_unsigned_to_nat(48u);
v___x_8_ = lean_unbox_uint32(v_head_3_);
v___x_9_ = lean_uint32_to_nat(v___x_8_);
v___x_10_ = lean_nat_dec_le(v___x_7_, v___x_9_);
if (v___x_10_ == 0)
{
lean_dec(v___x_9_);
return v___x_10_;
}
else
{
lean_object* v___x_11_; uint8_t v___x_12_; 
v___x_11_ = lean_unsigned_to_nat(57u);
v___x_12_ = lean_nat_dec_le(v___x_9_, v___x_11_);
lean_dec(v___x_9_);
return v___x_12_;
}
}
else
{
return v___x_6_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_numericHead___boxed(lean_object* v_input_13_){
_start:
{
uint8_t v_res_14_; lean_object* v_r_15_; 
v_res_14_ = lp_algalVerification_Algal_Core_JsonLayout_numericHead(v_input_13_);
lean_dec(v_input_13_);
v_r_15_ = lean_box(v_res_14_);
return v_r_15_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_renderItems___boxed__const__1(void){
_start:
{
uint32_t v___x_16_; lean_object* v___x_17_; 
v___x_16_ = 44;
v___x_17_ = lean_box_uint32(v___x_16_);
return v___x_17_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1(void){
_start:
{
uint32_t v___x_18_; lean_object* v___x_19_; 
v___x_18_ = 108;
v___x_19_ = lean_box_uint32(v___x_18_);
return v___x_19_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__0(void){
_start:
{
lean_object* v___x_20_; lean_object* v___x_21_; lean_object* v___x_22_; 
v___x_20_ = lean_box(0);
v___x_21_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
v___x_22_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_22_, 0, v___x_21_);
lean_ctor_set(v___x_22_, 1, v___x_20_);
return v___x_22_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__1(void){
_start:
{
lean_object* v___x_23_; lean_object* v___x_24_; lean_object* v___x_25_; 
v___x_23_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__0, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__0_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__0);
v___x_24_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
v___x_25_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_25_, 0, v___x_24_);
lean_ctor_set(v___x_25_, 1, v___x_23_);
return v___x_25_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1(void){
_start:
{
uint32_t v___x_26_; lean_object* v___x_27_; 
v___x_26_ = 117;
v___x_27_ = lean_box_uint32(v___x_26_);
return v___x_27_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__2(void){
_start:
{
lean_object* v___x_28_; lean_object* v___x_29_; lean_object* v___x_30_; 
v___x_28_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__1, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__1_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__1);
v___x_29_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
v___x_30_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_30_, 0, v___x_29_);
lean_ctor_set(v___x_30_, 1, v___x_28_);
return v___x_30_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1(void){
_start:
{
uint32_t v___x_31_; lean_object* v___x_32_; 
v___x_31_ = 110;
v___x_32_ = lean_box_uint32(v___x_31_);
return v___x_32_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__3(void){
_start:
{
lean_object* v___x_33_; lean_object* v___x_34_; lean_object* v___x_35_; 
v___x_33_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__2, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__2_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__2);
v___x_34_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
v___x_35_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_35_, 0, v___x_34_);
lean_ctor_set(v___x_35_, 1, v___x_33_);
return v___x_35_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__4___boxed__const__1(void){
_start:
{
uint32_t v___x_36_; lean_object* v___x_37_; 
v___x_36_ = 101;
v___x_37_ = lean_box_uint32(v___x_36_);
return v___x_37_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__4(void){
_start:
{
lean_object* v___x_38_; lean_object* v___x_39_; lean_object* v___x_40_; 
v___x_38_ = lean_box(0);
v___x_39_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__4___boxed__const__1;
v___x_40_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_40_, 0, v___x_39_);
lean_ctor_set(v___x_40_, 1, v___x_38_);
return v___x_40_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__5___boxed__const__1(void){
_start:
{
uint32_t v___x_41_; lean_object* v___x_42_; 
v___x_41_ = 115;
v___x_42_ = lean_box_uint32(v___x_41_);
return v___x_42_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__5(void){
_start:
{
lean_object* v___x_43_; lean_object* v___x_44_; lean_object* v___x_45_; 
v___x_43_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__4, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__4_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__4);
v___x_44_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__5___boxed__const__1;
v___x_45_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_45_, 0, v___x_44_);
lean_ctor_set(v___x_45_, 1, v___x_43_);
return v___x_45_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__6(void){
_start:
{
lean_object* v___x_46_; lean_object* v___x_47_; lean_object* v___x_48_; 
v___x_46_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__5, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__5_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__5);
v___x_47_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
v___x_48_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_48_, 0, v___x_47_);
lean_ctor_set(v___x_48_, 1, v___x_46_);
return v___x_48_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1(void){
_start:
{
uint32_t v___x_49_; lean_object* v___x_50_; 
v___x_49_ = 97;
v___x_50_ = lean_box_uint32(v___x_49_);
return v___x_50_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__7(void){
_start:
{
lean_object* v___x_51_; lean_object* v___x_52_; lean_object* v___x_53_; 
v___x_51_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__6, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__6_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__6);
v___x_52_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
v___x_53_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_53_, 0, v___x_52_);
lean_ctor_set(v___x_53_, 1, v___x_51_);
return v___x_53_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1(void){
_start:
{
uint32_t v___x_54_; lean_object* v___x_55_; 
v___x_54_ = 102;
v___x_55_ = lean_box_uint32(v___x_54_);
return v___x_55_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__8(void){
_start:
{
lean_object* v___x_56_; lean_object* v___x_57_; lean_object* v___x_58_; 
v___x_56_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__7, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__7_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__7);
v___x_57_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
v___x_58_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_58_, 0, v___x_57_);
lean_ctor_set(v___x_58_, 1, v___x_56_);
return v___x_58_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__9(void){
_start:
{
lean_object* v___x_59_; lean_object* v___x_60_; lean_object* v___x_61_; 
v___x_59_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__4, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__4_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__4);
v___x_60_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
v___x_61_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_61_, 0, v___x_60_);
lean_ctor_set(v___x_61_, 1, v___x_59_);
return v___x_61_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1(void){
_start:
{
uint32_t v___x_62_; lean_object* v___x_63_; 
v___x_62_ = 114;
v___x_63_ = lean_box_uint32(v___x_62_);
return v___x_63_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__10(void){
_start:
{
lean_object* v___x_64_; lean_object* v___x_65_; lean_object* v___x_66_; 
v___x_64_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__9, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__9_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__9);
v___x_65_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1;
v___x_66_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_66_, 0, v___x_65_);
lean_ctor_set(v___x_66_, 1, v___x_64_);
return v___x_66_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1(void){
_start:
{
uint32_t v___x_67_; lean_object* v___x_68_; 
v___x_67_ = 116;
v___x_68_ = lean_box_uint32(v___x_67_);
return v___x_68_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__11(void){
_start:
{
lean_object* v___x_69_; lean_object* v___x_70_; lean_object* v___x_71_; 
v___x_69_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__10, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__10_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__10);
v___x_70_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
v___x_71_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_71_, 0, v___x_70_);
lean_ctor_set(v___x_71_, 1, v___x_69_);
return v___x_71_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___boxed__const__1(void){
_start:
{
uint32_t v___x_72_; lean_object* v___x_73_; 
v___x_72_ = 91;
v___x_73_ = lean_box_uint32(v___x_72_);
return v___x_73_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__12___boxed__const__1(void){
_start:
{
uint32_t v___x_74_; lean_object* v___x_75_; 
v___x_74_ = 93;
v___x_75_ = lean_box_uint32(v___x_74_);
return v___x_75_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__12(void){
_start:
{
lean_object* v___x_76_; lean_object* v___x_77_; lean_object* v___x_78_; 
v___x_76_ = lean_box(0);
v___x_77_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__12___boxed__const__1;
v___x_78_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_78_, 0, v___x_77_);
lean_ctor_set(v___x_78_, 1, v___x_76_);
return v___x_78_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_renderFields___boxed__const__1(void){
_start:
{
uint32_t v___x_79_; lean_object* v___x_80_; 
v___x_79_ = 58;
v___x_80_ = lean_box_uint32(v___x_79_);
return v___x_80_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_renderFields(lean_object* v_numbers_81_, lean_object* v_x_82_){
_start:
{
if (lean_obj_tag(v_x_82_) == 0)
{
lean_object* v___x_83_; 
lean_dec_ref(v_numbers_81_);
v___x_83_ = lean_box(0);
return v___x_83_;
}
else
{
lean_object* v_rest_84_; 
v_rest_84_ = lean_ctor_get(v_x_82_, 2);
if (lean_obj_tag(v_rest_84_) == 0)
{
lean_object* v_key_85_; lean_object* v_value_86_; lean_object* v___x_87_; lean_object* v___x_88_; lean_object* v___x_89_; lean_object* v___x_90_; lean_object* v___x_91_; 
v_key_85_ = lean_ctor_get(v_x_82_, 0);
lean_inc_ref(v_key_85_);
v_value_86_ = lean_ctor_get(v_x_82_, 1);
lean_inc(v_value_86_);
lean_dec_ref_known(v_x_82_, 3);
v___x_87_ = lp_algalVerification_Algal_Core_JsonString_quoteChars(v_key_85_);
v___x_88_ = lp_algalVerification_Algal_Core_JsonLayout_render(v_numbers_81_, v_value_86_);
v___x_89_ = lp_algalVerification_Algal_Core_JsonLayout_renderFields___boxed__const__1;
v___x_90_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_90_, 0, v___x_89_);
lean_ctor_set(v___x_90_, 1, v___x_88_);
v___x_91_ = l_List_appendTR___redArg(v___x_87_, v___x_90_);
return v___x_91_;
}
else
{
lean_object* v_key_92_; lean_object* v_value_93_; lean_object* v___x_94_; lean_object* v___x_95_; lean_object* v___x_96_; lean_object* v___x_97_; lean_object* v___x_98_; lean_object* v___x_99_; lean_object* v___x_100_; lean_object* v___x_101_; lean_object* v___x_102_; 
lean_inc(v_rest_84_);
v_key_92_ = lean_ctor_get(v_x_82_, 0);
lean_inc_ref(v_key_92_);
v_value_93_ = lean_ctor_get(v_x_82_, 1);
lean_inc(v_value_93_);
lean_dec_ref_known(v_x_82_, 3);
v___x_94_ = lp_algalVerification_Algal_Core_JsonString_quoteChars(v_key_92_);
lean_inc_ref(v_numbers_81_);
v___x_95_ = lp_algalVerification_Algal_Core_JsonLayout_render(v_numbers_81_, v_value_93_);
v___x_96_ = lp_algalVerification_Algal_Core_JsonLayout_renderFields___boxed__const__1;
v___x_97_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_97_, 0, v___x_96_);
lean_ctor_set(v___x_97_, 1, v___x_95_);
v___x_98_ = l_List_appendTR___redArg(v___x_94_, v___x_97_);
v___x_99_ = lp_algalVerification_Algal_Core_JsonLayout_renderFields(v_numbers_81_, v_rest_84_);
v___x_100_ = lp_algalVerification_Algal_Core_JsonLayout_renderItems___boxed__const__1;
v___x_101_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_101_, 0, v___x_100_);
lean_ctor_set(v___x_101_, 1, v___x_99_);
v___x_102_ = l_List_appendTR___redArg(v___x_98_, v___x_101_);
return v___x_102_;
}
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___boxed__const__2(void){
_start:
{
uint32_t v___x_103_; lean_object* v___x_104_; 
v___x_103_ = 123;
v___x_104_ = lean_box_uint32(v___x_103_);
return v___x_104_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__13___boxed__const__1(void){
_start:
{
uint32_t v___x_105_; lean_object* v___x_106_; 
v___x_105_ = 125;
v___x_106_ = lean_box_uint32(v___x_105_);
return v___x_106_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__13(void){
_start:
{
lean_object* v___x_107_; lean_object* v___x_108_; lean_object* v___x_109_; 
v___x_107_ = lean_box(0);
v___x_108_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__13___boxed__const__1;
v___x_109_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_109_, 0, v___x_108_);
lean_ctor_set(v___x_109_, 1, v___x_107_);
return v___x_109_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_render(lean_object* v_numbers_110_, lean_object* v_x_111_){
_start:
{
switch(lean_obj_tag(v_x_111_))
{
case 0:
{
lean_object* v___x_112_; 
lean_dec_ref(v_numbers_110_);
v___x_112_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__3, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__3_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__3);
return v___x_112_;
}
case 1:
{
uint8_t v_value_113_; 
lean_dec_ref(v_numbers_110_);
v_value_113_ = lean_ctor_get_uint8(v_x_111_, 0);
lean_dec_ref_known(v_x_111_, 0);
if (v_value_113_ == 0)
{
lean_object* v___x_114_; 
v___x_114_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__8, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__8_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__8);
return v___x_114_;
}
else
{
lean_object* v___x_115_; 
v___x_115_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__11, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__11_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__11);
return v___x_115_;
}
}
case 2:
{
uint64_t v_value_116_; lean_object* v_render_117_; lean_object* v___x_118_; lean_object* v___x_119_; 
v_value_116_ = lean_ctor_get_uint64(v_x_111_, 0);
lean_dec_ref_known(v_x_111_, 0);
v_render_117_ = lean_ctor_get(v_numbers_110_, 0);
lean_inc_ref(v_render_117_);
lean_dec_ref(v_numbers_110_);
v___x_118_ = lean_box_uint64(v_value_116_);
v___x_119_ = lean_apply_1(v_render_117_, v___x_118_);
return v___x_119_;
}
case 3:
{
lean_object* v_value_120_; lean_object* v___x_121_; 
lean_dec_ref(v_numbers_110_);
v_value_120_ = lean_ctor_get(v_x_111_, 0);
lean_inc_ref(v_value_120_);
lean_dec_ref_known(v_x_111_, 1);
v___x_121_ = lp_algalVerification_Algal_Core_JsonString_quoteChars(v_value_120_);
return v___x_121_;
}
case 4:
{
lean_object* v_values_122_; lean_object* v___x_123_; lean_object* v___x_124_; lean_object* v___x_125_; lean_object* v___x_126_; lean_object* v___x_127_; 
v_values_122_ = lean_ctor_get(v_x_111_, 0);
lean_inc(v_values_122_);
lean_dec_ref_known(v_x_111_, 1);
v___x_123_ = lp_algalVerification_Algal_Core_JsonLayout_renderItems(v_numbers_110_, v_values_122_);
v___x_124_ = lp_algalVerification_Algal_Core_JsonLayout_render___boxed__const__1;
v___x_125_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_125_, 0, v___x_124_);
lean_ctor_set(v___x_125_, 1, v___x_123_);
v___x_126_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__12, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__12_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__12);
v___x_127_ = l_List_appendTR___redArg(v___x_125_, v___x_126_);
return v___x_127_;
}
default: 
{
lean_object* v_fields_128_; lean_object* v___x_129_; lean_object* v___x_130_; lean_object* v___x_131_; lean_object* v___x_132_; lean_object* v___x_133_; 
v_fields_128_ = lean_ctor_get(v_x_111_, 0);
lean_inc(v_fields_128_);
lean_dec_ref_known(v_x_111_, 1);
v___x_129_ = lp_algalVerification_Algal_Core_JsonLayout_renderFields(v_numbers_110_, v_fields_128_);
v___x_130_ = lp_algalVerification_Algal_Core_JsonLayout_render___boxed__const__2;
v___x_131_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_131_, 0, v___x_130_);
lean_ctor_set(v___x_131_, 1, v___x_129_);
v___x_132_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_render___closed__13, &lp_algalVerification_Algal_Core_JsonLayout_render___closed__13_once, _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__13);
v___x_133_ = l_List_appendTR___redArg(v___x_131_, v___x_132_);
return v___x_133_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_renderItems(lean_object* v_numbers_134_, lean_object* v_x_135_){
_start:
{
if (lean_obj_tag(v_x_135_) == 0)
{
lean_object* v___x_136_; 
lean_dec_ref(v_numbers_134_);
v___x_136_ = lean_box(0);
return v___x_136_;
}
else
{
lean_object* v_rest_137_; 
v_rest_137_ = lean_ctor_get(v_x_135_, 1);
if (lean_obj_tag(v_rest_137_) == 0)
{
lean_object* v_value_138_; lean_object* v___x_139_; 
v_value_138_ = lean_ctor_get(v_x_135_, 0);
lean_inc(v_value_138_);
lean_dec_ref_known(v_x_135_, 2);
v___x_139_ = lp_algalVerification_Algal_Core_JsonLayout_render(v_numbers_134_, v_value_138_);
return v___x_139_;
}
else
{
lean_object* v_value_140_; lean_object* v___x_142_; uint8_t v_isShared_143_; uint8_t v_isSharedCheck_151_; 
lean_inc(v_rest_137_);
v_value_140_ = lean_ctor_get(v_x_135_, 0);
v_isSharedCheck_151_ = !lean_is_exclusive(v_x_135_);
if (v_isSharedCheck_151_ == 0)
{
lean_object* v_unused_152_; 
v_unused_152_ = lean_ctor_get(v_x_135_, 1);
lean_dec(v_unused_152_);
v___x_142_ = v_x_135_;
v_isShared_143_ = v_isSharedCheck_151_;
goto v_resetjp_141_;
}
else
{
lean_inc(v_value_140_);
lean_dec(v_x_135_);
v___x_142_ = lean_box(0);
v_isShared_143_ = v_isSharedCheck_151_;
goto v_resetjp_141_;
}
v_resetjp_141_:
{
lean_object* v___x_144_; lean_object* v___x_145_; lean_object* v___x_146_; lean_object* v___x_148_; 
lean_inc_ref(v_numbers_134_);
v___x_144_ = lp_algalVerification_Algal_Core_JsonLayout_render(v_numbers_134_, v_value_140_);
v___x_145_ = lp_algalVerification_Algal_Core_JsonLayout_renderItems(v_numbers_134_, v_rest_137_);
v___x_146_ = lp_algalVerification_Algal_Core_JsonLayout_renderItems___boxed__const__1;
if (v_isShared_143_ == 0)
{
lean_ctor_set(v___x_142_, 1, v___x_145_);
lean_ctor_set(v___x_142_, 0, v___x_146_);
v___x_148_ = v___x_142_;
goto v_reusejp_147_;
}
else
{
lean_object* v_reuseFailAlloc_150_; 
v_reuseFailAlloc_150_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_150_, 0, v___x_146_);
lean_ctor_set(v_reuseFailAlloc_150_, 1, v___x_145_);
v___x_148_ = v_reuseFailAlloc_150_;
goto v_reusejp_147_;
}
v_reusejp_147_:
{
lean_object* v___x_149_; 
v___x_149_ = l_List_appendTR___redArg(v___x_144_, v___x_148_);
return v___x_149_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_weightItems(lean_object* v_x_153_){
_start:
{
lean_object* v___y_155_; 
if (lean_obj_tag(v_x_153_) == 0)
{
lean_object* v___x_158_; 
v___x_158_ = lean_unsigned_to_nat(1u);
return v___x_158_;
}
else
{
lean_object* v_value_159_; lean_object* v_rest_160_; lean_object* v___x_161_; lean_object* v___x_162_; uint8_t v___x_163_; 
v_value_159_ = lean_ctor_get(v_x_153_, 0);
v_rest_160_ = lean_ctor_get(v_x_153_, 1);
v___x_161_ = lp_algalVerification_Algal_Core_JsonLayout_weight(v_value_159_);
v___x_162_ = lp_algalVerification_Algal_Core_JsonLayout_weightItems(v_rest_160_);
v___x_163_ = lean_nat_dec_le(v___x_161_, v___x_162_);
if (v___x_163_ == 0)
{
lean_dec(v___x_162_);
v___y_155_ = v___x_161_;
goto v___jp_154_;
}
else
{
lean_dec(v___x_161_);
v___y_155_ = v___x_162_;
goto v___jp_154_;
}
}
v___jp_154_:
{
lean_object* v___x_156_; lean_object* v___x_157_; 
v___x_156_ = lean_unsigned_to_nat(1u);
v___x_157_ = lean_nat_add(v___y_155_, v___x_156_);
lean_dec(v___y_155_);
return v___x_157_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_weightFields(lean_object* v_x_164_){
_start:
{
lean_object* v___y_166_; 
if (lean_obj_tag(v_x_164_) == 0)
{
lean_object* v___x_169_; 
v___x_169_ = lean_unsigned_to_nat(1u);
return v___x_169_;
}
else
{
lean_object* v_value_170_; lean_object* v_rest_171_; lean_object* v___x_172_; lean_object* v___x_173_; uint8_t v___x_174_; 
v_value_170_ = lean_ctor_get(v_x_164_, 1);
v_rest_171_ = lean_ctor_get(v_x_164_, 2);
v___x_172_ = lp_algalVerification_Algal_Core_JsonLayout_weight(v_value_170_);
v___x_173_ = lp_algalVerification_Algal_Core_JsonLayout_weightFields(v_rest_171_);
v___x_174_ = lean_nat_dec_le(v___x_172_, v___x_173_);
if (v___x_174_ == 0)
{
lean_dec(v___x_173_);
v___y_166_ = v___x_172_;
goto v___jp_165_;
}
else
{
lean_dec(v___x_172_);
v___y_166_ = v___x_173_;
goto v___jp_165_;
}
}
v___jp_165_:
{
lean_object* v___x_167_; lean_object* v___x_168_; 
v___x_167_ = lean_unsigned_to_nat(1u);
v___x_168_ = lean_nat_add(v___y_166_, v___x_167_);
lean_dec(v___y_166_);
return v___x_168_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_weight(lean_object* v_x_175_){
_start:
{
switch(lean_obj_tag(v_x_175_))
{
case 4:
{
lean_object* v_values_176_; lean_object* v___x_177_; lean_object* v___x_178_; lean_object* v___x_179_; 
v_values_176_ = lean_ctor_get(v_x_175_, 0);
v___x_177_ = lp_algalVerification_Algal_Core_JsonLayout_weightItems(v_values_176_);
v___x_178_ = lean_unsigned_to_nat(1u);
v___x_179_ = lean_nat_add(v___x_177_, v___x_178_);
lean_dec(v___x_177_);
return v___x_179_;
}
case 5:
{
lean_object* v_fields_180_; lean_object* v___x_181_; lean_object* v___x_182_; lean_object* v___x_183_; 
v_fields_180_ = lean_ctor_get(v_x_175_, 0);
v___x_181_ = lp_algalVerification_Algal_Core_JsonLayout_weightFields(v_fields_180_);
v___x_182_ = lean_unsigned_to_nat(1u);
v___x_183_ = lean_nat_add(v___x_181_, v___x_182_);
lean_dec(v___x_181_);
return v___x_183_;
}
default: 
{
lean_object* v___x_184_; 
v___x_184_ = lean_unsigned_to_nat(1u);
return v___x_184_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_weight___boxed(lean_object* v_x_185_){
_start:
{
lean_object* v_res_186_; 
v_res_186_ = lp_algalVerification_Algal_Core_JsonLayout_weight(v_x_185_);
lean_dec(v_x_185_);
return v_res_186_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_weightFields___boxed(lean_object* v_x_187_){
_start:
{
lean_object* v_res_188_; 
v_res_188_ = lp_algalVerification_Algal_Core_JsonLayout_weightFields(v_x_187_);
lean_dec(v_x_187_);
return v_res_188_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_weightItems___boxed(lean_object* v_x_189_){
_start:
{
lean_object* v_res_190_; 
v_res_190_ = lp_algalVerification_Algal_Core_JsonLayout_weightItems(v_x_189_);
lean_dec(v_x_189_);
return v_res_190_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_readItems___closed__0(void){
_start:
{
lean_object* v___x_191_; lean_object* v___x_192_; 
v___x_191_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__12___boxed__const__1;
v___x_192_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_192_, 0, v___x_191_);
return v___x_192_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonLayout_readFields___closed__0(void){
_start:
{
lean_object* v___x_193_; lean_object* v___x_194_; 
v___x_193_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__13___boxed__const__1;
v___x_194_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_194_, 0, v___x_193_);
return v___x_194_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readFields(lean_object* v_numbers_195_, lean_object* v_x_196_, uint8_t v_x_197_, lean_object* v_x_198_){
_start:
{
lean_object* v_zero_199_; uint8_t v_isZero_200_; 
v_zero_199_ = lean_unsigned_to_nat(0u);
v_isZero_200_ = lean_nat_dec_eq(v_x_196_, v_zero_199_);
if (v_isZero_200_ == 1)
{
lean_object* v___x_201_; 
lean_dec(v_x_198_);
lean_dec_ref(v_numbers_195_);
v___x_201_ = lean_box(0);
return v___x_201_;
}
else
{
lean_object* v_one_202_; lean_object* v_n_203_; 
v_one_202_ = lean_unsigned_to_nat(1u);
v_n_203_ = lean_nat_sub(v_x_196_, v_one_202_);
if (v_x_197_ == 0)
{
goto v___jp_204_;
}
else
{
lean_object* v___x_268_; lean_object* v___x_269_; lean_object* v___x_270_; uint8_t v___x_271_; 
v___x_268_ = lean_alloc_closure((void*)(l_instDecidableEqChar___boxed), 2, 0);
v___x_269_ = l_List_head_x3f___redArg(v_x_198_);
v___x_270_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_readFields___closed__0, &lp_algalVerification_Algal_Core_JsonLayout_readFields___closed__0_once, _init_lp_algalVerification_Algal_Core_JsonLayout_readFields___closed__0);
v___x_271_ = l_Option_instDecidableEq___redArg(v___x_268_, v___x_269_, v___x_270_);
if (v___x_271_ == 0)
{
goto v___jp_204_;
}
else
{
lean_object* v___x_272_; lean_object* v___y_274_; 
lean_dec(v_n_203_);
lean_dec_ref(v_numbers_195_);
v___x_272_ = lean_box(0);
if (lean_obj_tag(v_x_198_) == 0)
{
v___y_274_ = v_x_198_;
goto v___jp_273_;
}
else
{
lean_object* v_tail_277_; 
v_tail_277_ = lean_ctor_get(v_x_198_, 1);
lean_inc(v_tail_277_);
lean_dec_ref_known(v_x_198_, 2);
v___y_274_ = v_tail_277_;
goto v___jp_273_;
}
v___jp_273_:
{
lean_object* v___x_275_; lean_object* v___x_276_; 
v___x_275_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_275_, 0, v___x_272_);
lean_ctor_set(v___x_275_, 1, v___y_274_);
v___x_276_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_276_, 0, v___x_275_);
return v___x_276_;
}
}
}
v___jp_204_:
{
lean_object* v___x_205_; 
v___x_205_ = lp_algalVerification_Algal_Core_JsonString_readQuoted(v_x_198_);
if (lean_obj_tag(v___x_205_) == 0)
{
lean_object* v___x_206_; 
lean_dec(v_n_203_);
lean_dec_ref(v_numbers_195_);
v___x_206_ = lean_box(0);
return v___x_206_;
}
else
{
lean_object* v_val_207_; lean_object* v_snd_208_; 
v_val_207_ = lean_ctor_get(v___x_205_, 0);
lean_inc(v_val_207_);
lean_dec_ref_known(v___x_205_, 1);
v_snd_208_ = lean_ctor_get(v_val_207_, 1);
lean_inc(v_snd_208_);
if (lean_obj_tag(v_snd_208_) == 1)
{
lean_object* v_fst_209_; lean_object* v_head_210_; lean_object* v_tail_211_; uint32_t v___x_212_; uint32_t v___x_213_; uint8_t v___x_214_; 
v_fst_209_ = lean_ctor_get(v_val_207_, 0);
lean_inc(v_fst_209_);
lean_dec(v_val_207_);
v_head_210_ = lean_ctor_get(v_snd_208_, 0);
lean_inc(v_head_210_);
v_tail_211_ = lean_ctor_get(v_snd_208_, 1);
lean_inc(v_tail_211_);
lean_dec_ref_known(v_snd_208_, 2);
v___x_212_ = 58;
v___x_213_ = lean_unbox_uint32(v_head_210_);
lean_dec(v_head_210_);
v___x_214_ = lean_uint32_dec_eq(v___x_213_, v___x_212_);
if (v___x_214_ == 0)
{
lean_object* v___x_215_; 
lean_dec(v_tail_211_);
lean_dec(v_fst_209_);
lean_dec(v_n_203_);
lean_dec_ref(v_numbers_195_);
v___x_215_ = lean_box(0);
return v___x_215_;
}
else
{
lean_object* v___x_216_; 
lean_inc_ref(v_numbers_195_);
v___x_216_ = lp_algalVerification_Algal_Core_JsonLayout_readValue(v_numbers_195_, v_n_203_, v_tail_211_);
if (lean_obj_tag(v___x_216_) == 0)
{
lean_object* v___x_217_; 
lean_dec(v_fst_209_);
lean_dec(v_n_203_);
lean_dec_ref(v_numbers_195_);
v___x_217_ = lean_box(0);
return v___x_217_;
}
else
{
lean_object* v_val_218_; lean_object* v___x_220_; uint8_t v_isShared_221_; uint8_t v_isSharedCheck_266_; 
v_val_218_ = lean_ctor_get(v___x_216_, 0);
v_isSharedCheck_266_ = !lean_is_exclusive(v___x_216_);
if (v_isSharedCheck_266_ == 0)
{
v___x_220_ = v___x_216_;
v_isShared_221_ = v_isSharedCheck_266_;
goto v_resetjp_219_;
}
else
{
lean_inc(v_val_218_);
lean_dec(v___x_216_);
v___x_220_ = lean_box(0);
v_isShared_221_ = v_isSharedCheck_266_;
goto v_resetjp_219_;
}
v_resetjp_219_:
{
lean_object* v_snd_222_; 
v_snd_222_ = lean_ctor_get(v_val_218_, 1);
lean_inc(v_snd_222_);
if (lean_obj_tag(v_snd_222_) == 1)
{
lean_object* v_fst_223_; lean_object* v___x_225_; uint8_t v_isShared_226_; uint8_t v_isSharedCheck_263_; 
v_fst_223_ = lean_ctor_get(v_val_218_, 0);
v_isSharedCheck_263_ = !lean_is_exclusive(v_val_218_);
if (v_isSharedCheck_263_ == 0)
{
lean_object* v_unused_264_; 
v_unused_264_ = lean_ctor_get(v_val_218_, 1);
lean_dec(v_unused_264_);
v___x_225_ = v_val_218_;
v_isShared_226_ = v_isSharedCheck_263_;
goto v_resetjp_224_;
}
else
{
lean_inc(v_fst_223_);
lean_dec(v_val_218_);
v___x_225_ = lean_box(0);
v_isShared_226_ = v_isSharedCheck_263_;
goto v_resetjp_224_;
}
v_resetjp_224_:
{
lean_object* v_head_227_; lean_object* v_tail_228_; uint32_t v___x_229_; uint32_t v___x_230_; uint8_t v___x_231_; 
v_head_227_ = lean_ctor_get(v_snd_222_, 0);
lean_inc(v_head_227_);
v_tail_228_ = lean_ctor_get(v_snd_222_, 1);
lean_inc(v_tail_228_);
lean_dec_ref_known(v_snd_222_, 2);
v___x_229_ = 125;
v___x_230_ = lean_unbox_uint32(v_head_227_);
v___x_231_ = lean_uint32_dec_eq(v___x_230_, v___x_229_);
if (v___x_231_ == 0)
{
uint32_t v___x_232_; uint32_t v___x_233_; uint8_t v___x_234_; 
lean_del_object(v___x_225_);
lean_del_object(v___x_220_);
v___x_232_ = 44;
v___x_233_ = lean_unbox_uint32(v_head_227_);
lean_dec(v_head_227_);
v___x_234_ = lean_uint32_dec_eq(v___x_233_, v___x_232_);
if (v___x_234_ == 0)
{
lean_object* v___x_235_; 
lean_dec(v_tail_228_);
lean_dec(v_fst_223_);
lean_dec(v_fst_209_);
lean_dec(v_n_203_);
lean_dec_ref(v_numbers_195_);
v___x_235_ = lean_box(0);
return v___x_235_;
}
else
{
lean_object* v___x_236_; 
v___x_236_ = lp_algalVerification_Algal_Core_JsonLayout_readFields(v_numbers_195_, v_n_203_, v___x_231_, v_tail_228_);
lean_dec(v_n_203_);
if (lean_obj_tag(v___x_236_) == 0)
{
lean_dec(v_fst_223_);
lean_dec(v_fst_209_);
return v___x_236_;
}
else
{
lean_object* v_val_237_; lean_object* v___x_239_; uint8_t v_isShared_240_; uint8_t v_isSharedCheck_254_; 
v_val_237_ = lean_ctor_get(v___x_236_, 0);
v_isSharedCheck_254_ = !lean_is_exclusive(v___x_236_);
if (v_isSharedCheck_254_ == 0)
{
v___x_239_ = v___x_236_;
v_isShared_240_ = v_isSharedCheck_254_;
goto v_resetjp_238_;
}
else
{
lean_inc(v_val_237_);
lean_dec(v___x_236_);
v___x_239_ = lean_box(0);
v_isShared_240_ = v_isSharedCheck_254_;
goto v_resetjp_238_;
}
v_resetjp_238_:
{
lean_object* v_fst_241_; lean_object* v_snd_242_; lean_object* v___x_244_; uint8_t v_isShared_245_; uint8_t v_isSharedCheck_253_; 
v_fst_241_ = lean_ctor_get(v_val_237_, 0);
v_snd_242_ = lean_ctor_get(v_val_237_, 1);
v_isSharedCheck_253_ = !lean_is_exclusive(v_val_237_);
if (v_isSharedCheck_253_ == 0)
{
v___x_244_ = v_val_237_;
v_isShared_245_ = v_isSharedCheck_253_;
goto v_resetjp_243_;
}
else
{
lean_inc(v_snd_242_);
lean_inc(v_fst_241_);
lean_dec(v_val_237_);
v___x_244_ = lean_box(0);
v_isShared_245_ = v_isSharedCheck_253_;
goto v_resetjp_243_;
}
v_resetjp_243_:
{
lean_object* v___x_246_; lean_object* v___x_248_; 
v___x_246_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_246_, 0, v_fst_209_);
lean_ctor_set(v___x_246_, 1, v_fst_223_);
lean_ctor_set(v___x_246_, 2, v_fst_241_);
if (v_isShared_245_ == 0)
{
lean_ctor_set(v___x_244_, 0, v___x_246_);
v___x_248_ = v___x_244_;
goto v_reusejp_247_;
}
else
{
lean_object* v_reuseFailAlloc_252_; 
v_reuseFailAlloc_252_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_252_, 0, v___x_246_);
lean_ctor_set(v_reuseFailAlloc_252_, 1, v_snd_242_);
v___x_248_ = v_reuseFailAlloc_252_;
goto v_reusejp_247_;
}
v_reusejp_247_:
{
lean_object* v___x_250_; 
if (v_isShared_240_ == 0)
{
lean_ctor_set(v___x_239_, 0, v___x_248_);
v___x_250_ = v___x_239_;
goto v_reusejp_249_;
}
else
{
lean_object* v_reuseFailAlloc_251_; 
v_reuseFailAlloc_251_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_251_, 0, v___x_248_);
v___x_250_ = v_reuseFailAlloc_251_;
goto v_reusejp_249_;
}
v_reusejp_249_:
{
return v___x_250_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_255_; lean_object* v___x_256_; lean_object* v___x_258_; 
lean_dec(v_head_227_);
lean_dec(v_n_203_);
lean_dec_ref(v_numbers_195_);
v___x_255_ = lean_box(0);
v___x_256_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_256_, 0, v_fst_209_);
lean_ctor_set(v___x_256_, 1, v_fst_223_);
lean_ctor_set(v___x_256_, 2, v___x_255_);
if (v_isShared_226_ == 0)
{
lean_ctor_set(v___x_225_, 1, v_tail_228_);
lean_ctor_set(v___x_225_, 0, v___x_256_);
v___x_258_ = v___x_225_;
goto v_reusejp_257_;
}
else
{
lean_object* v_reuseFailAlloc_262_; 
v_reuseFailAlloc_262_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_262_, 0, v___x_256_);
lean_ctor_set(v_reuseFailAlloc_262_, 1, v_tail_228_);
v___x_258_ = v_reuseFailAlloc_262_;
goto v_reusejp_257_;
}
v_reusejp_257_:
{
lean_object* v___x_260_; 
if (v_isShared_221_ == 0)
{
lean_ctor_set(v___x_220_, 0, v___x_258_);
v___x_260_ = v___x_220_;
goto v_reusejp_259_;
}
else
{
lean_object* v_reuseFailAlloc_261_; 
v_reuseFailAlloc_261_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_261_, 0, v___x_258_);
v___x_260_ = v_reuseFailAlloc_261_;
goto v_reusejp_259_;
}
v_reusejp_259_:
{
return v___x_260_;
}
}
}
}
}
else
{
lean_object* v___x_265_; 
lean_dec(v_snd_222_);
lean_del_object(v___x_220_);
lean_dec(v_val_218_);
lean_dec(v_fst_209_);
lean_dec(v_n_203_);
lean_dec_ref(v_numbers_195_);
v___x_265_ = lean_box(0);
return v___x_265_;
}
}
}
}
}
else
{
lean_object* v___x_267_; 
lean_dec(v_snd_208_);
lean_dec(v_val_207_);
lean_dec(v_n_203_);
lean_dec_ref(v_numbers_195_);
v___x_267_ = lean_box(0);
return v___x_267_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readValue(lean_object* v_numbers_280_, lean_object* v_x_281_, lean_object* v_x_282_){
_start:
{
lean_object* v_zero_283_; uint8_t v_isZero_284_; 
v_zero_283_ = lean_unsigned_to_nat(0u);
v_isZero_284_ = lean_nat_dec_eq(v_x_281_, v_zero_283_);
if (v_isZero_284_ == 1)
{
lean_object* v___x_285_; 
lean_dec(v_x_282_);
lean_dec_ref(v_numbers_280_);
v___x_285_ = lean_box(0);
return v___x_285_;
}
else
{
uint8_t v___x_286_; 
v___x_286_ = lp_algalVerification_Algal_Core_JsonLayout_numericHead(v_x_282_);
if (v___x_286_ == 0)
{
if (lean_obj_tag(v_x_282_) == 1)
{
lean_object* v_head_287_; lean_object* v_tail_288_; uint32_t v___x_289_; uint32_t v___x_290_; uint8_t v___x_291_; 
v_head_287_ = lean_ctor_get(v_x_282_, 0);
v_tail_288_ = lean_ctor_get(v_x_282_, 1);
v___x_289_ = 110;
v___x_290_ = lean_unbox_uint32(v_head_287_);
v___x_291_ = lean_uint32_dec_eq(v___x_290_, v___x_289_);
if (v___x_291_ == 0)
{
uint8_t v___x_292_; uint32_t v___x_293_; uint32_t v___x_294_; uint8_t v___x_295_; 
v___x_292_ = 1;
v___x_293_ = 116;
v___x_294_ = lean_unbox_uint32(v_head_287_);
v___x_295_ = lean_uint32_dec_eq(v___x_294_, v___x_293_);
if (v___x_295_ == 0)
{
uint32_t v___x_296_; uint32_t v___x_297_; uint8_t v___x_298_; 
v___x_296_ = 102;
v___x_297_ = lean_unbox_uint32(v_head_287_);
v___x_298_ = lean_uint32_dec_eq(v___x_297_, v___x_296_);
if (v___x_298_ == 0)
{
uint32_t v___x_299_; uint32_t v___x_300_; uint8_t v___x_301_; 
v___x_299_ = 34;
v___x_300_ = lean_unbox_uint32(v_head_287_);
v___x_301_ = lean_uint32_dec_eq(v___x_300_, v___x_299_);
if (v___x_301_ == 0)
{
lean_object* v_one_302_; lean_object* v_n_303_; uint32_t v___x_304_; uint32_t v___x_305_; uint8_t v___x_306_; 
lean_inc(v_tail_288_);
lean_inc(v_head_287_);
lean_dec_ref_known(v_x_282_, 2);
v_one_302_ = lean_unsigned_to_nat(1u);
v_n_303_ = lean_nat_sub(v_x_281_, v_one_302_);
v___x_304_ = 91;
v___x_305_ = lean_unbox_uint32(v_head_287_);
v___x_306_ = lean_uint32_dec_eq(v___x_305_, v___x_304_);
if (v___x_306_ == 0)
{
uint32_t v___x_307_; uint32_t v___x_308_; uint8_t v___x_309_; 
v___x_307_ = 123;
v___x_308_ = lean_unbox_uint32(v_head_287_);
lean_dec(v_head_287_);
v___x_309_ = lean_uint32_dec_eq(v___x_308_, v___x_307_);
if (v___x_309_ == 0)
{
lean_object* v___x_310_; 
lean_dec(v_n_303_);
lean_dec(v_tail_288_);
lean_dec_ref(v_numbers_280_);
v___x_310_ = lean_box(0);
return v___x_310_;
}
else
{
lean_object* v___x_311_; 
v___x_311_ = lp_algalVerification_Algal_Core_JsonLayout_readFields(v_numbers_280_, v_n_303_, v___x_292_, v_tail_288_);
lean_dec(v_n_303_);
if (lean_obj_tag(v___x_311_) == 0)
{
lean_object* v___x_312_; 
v___x_312_ = lean_box(0);
return v___x_312_;
}
else
{
lean_object* v_val_313_; lean_object* v___x_315_; uint8_t v_isShared_316_; uint8_t v_isSharedCheck_330_; 
v_val_313_ = lean_ctor_get(v___x_311_, 0);
v_isSharedCheck_330_ = !lean_is_exclusive(v___x_311_);
if (v_isSharedCheck_330_ == 0)
{
v___x_315_ = v___x_311_;
v_isShared_316_ = v_isSharedCheck_330_;
goto v_resetjp_314_;
}
else
{
lean_inc(v_val_313_);
lean_dec(v___x_311_);
v___x_315_ = lean_box(0);
v_isShared_316_ = v_isSharedCheck_330_;
goto v_resetjp_314_;
}
v_resetjp_314_:
{
lean_object* v_fst_317_; lean_object* v_snd_318_; lean_object* v___x_320_; uint8_t v_isShared_321_; uint8_t v_isSharedCheck_329_; 
v_fst_317_ = lean_ctor_get(v_val_313_, 0);
v_snd_318_ = lean_ctor_get(v_val_313_, 1);
v_isSharedCheck_329_ = !lean_is_exclusive(v_val_313_);
if (v_isSharedCheck_329_ == 0)
{
v___x_320_ = v_val_313_;
v_isShared_321_ = v_isSharedCheck_329_;
goto v_resetjp_319_;
}
else
{
lean_inc(v_snd_318_);
lean_inc(v_fst_317_);
lean_dec(v_val_313_);
v___x_320_ = lean_box(0);
v_isShared_321_ = v_isSharedCheck_329_;
goto v_resetjp_319_;
}
v_resetjp_319_:
{
lean_object* v___x_322_; lean_object* v___x_324_; 
v___x_322_ = lean_alloc_ctor(5, 1, 0);
lean_ctor_set(v___x_322_, 0, v_fst_317_);
if (v_isShared_321_ == 0)
{
lean_ctor_set(v___x_320_, 0, v___x_322_);
v___x_324_ = v___x_320_;
goto v_reusejp_323_;
}
else
{
lean_object* v_reuseFailAlloc_328_; 
v_reuseFailAlloc_328_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_328_, 0, v___x_322_);
lean_ctor_set(v_reuseFailAlloc_328_, 1, v_snd_318_);
v___x_324_ = v_reuseFailAlloc_328_;
goto v_reusejp_323_;
}
v_reusejp_323_:
{
lean_object* v___x_326_; 
if (v_isShared_316_ == 0)
{
lean_ctor_set(v___x_315_, 0, v___x_324_);
v___x_326_ = v___x_315_;
goto v_reusejp_325_;
}
else
{
lean_object* v_reuseFailAlloc_327_; 
v_reuseFailAlloc_327_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_327_, 0, v___x_324_);
v___x_326_ = v_reuseFailAlloc_327_;
goto v_reusejp_325_;
}
v_reusejp_325_:
{
return v___x_326_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_331_; 
lean_dec(v_head_287_);
v___x_331_ = lp_algalVerification_Algal_Core_JsonLayout_readItems(v_numbers_280_, v_n_303_, v___x_292_, v_tail_288_);
lean_dec(v_n_303_);
if (lean_obj_tag(v___x_331_) == 0)
{
lean_object* v___x_332_; 
v___x_332_ = lean_box(0);
return v___x_332_;
}
else
{
lean_object* v_val_333_; lean_object* v___x_335_; uint8_t v_isShared_336_; uint8_t v_isSharedCheck_350_; 
v_val_333_ = lean_ctor_get(v___x_331_, 0);
v_isSharedCheck_350_ = !lean_is_exclusive(v___x_331_);
if (v_isSharedCheck_350_ == 0)
{
v___x_335_ = v___x_331_;
v_isShared_336_ = v_isSharedCheck_350_;
goto v_resetjp_334_;
}
else
{
lean_inc(v_val_333_);
lean_dec(v___x_331_);
v___x_335_ = lean_box(0);
v_isShared_336_ = v_isSharedCheck_350_;
goto v_resetjp_334_;
}
v_resetjp_334_:
{
lean_object* v_fst_337_; lean_object* v_snd_338_; lean_object* v___x_340_; uint8_t v_isShared_341_; uint8_t v_isSharedCheck_349_; 
v_fst_337_ = lean_ctor_get(v_val_333_, 0);
v_snd_338_ = lean_ctor_get(v_val_333_, 1);
v_isSharedCheck_349_ = !lean_is_exclusive(v_val_333_);
if (v_isSharedCheck_349_ == 0)
{
v___x_340_ = v_val_333_;
v_isShared_341_ = v_isSharedCheck_349_;
goto v_resetjp_339_;
}
else
{
lean_inc(v_snd_338_);
lean_inc(v_fst_337_);
lean_dec(v_val_333_);
v___x_340_ = lean_box(0);
v_isShared_341_ = v_isSharedCheck_349_;
goto v_resetjp_339_;
}
v_resetjp_339_:
{
lean_object* v___x_342_; lean_object* v___x_344_; 
v___x_342_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v___x_342_, 0, v_fst_337_);
if (v_isShared_341_ == 0)
{
lean_ctor_set(v___x_340_, 0, v___x_342_);
v___x_344_ = v___x_340_;
goto v_reusejp_343_;
}
else
{
lean_object* v_reuseFailAlloc_348_; 
v_reuseFailAlloc_348_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_348_, 0, v___x_342_);
lean_ctor_set(v_reuseFailAlloc_348_, 1, v_snd_338_);
v___x_344_ = v_reuseFailAlloc_348_;
goto v_reusejp_343_;
}
v_reusejp_343_:
{
lean_object* v___x_346_; 
if (v_isShared_336_ == 0)
{
lean_ctor_set(v___x_335_, 0, v___x_344_);
v___x_346_ = v___x_335_;
goto v_reusejp_345_;
}
else
{
lean_object* v_reuseFailAlloc_347_; 
v_reuseFailAlloc_347_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_347_, 0, v___x_344_);
v___x_346_ = v_reuseFailAlloc_347_;
goto v_reusejp_345_;
}
v_reusejp_345_:
{
return v___x_346_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_351_; 
lean_dec_ref(v_numbers_280_);
v___x_351_ = lp_algalVerification_Algal_Core_JsonString_readQuoted(v_x_282_);
if (lean_obj_tag(v___x_351_) == 0)
{
lean_object* v___x_352_; 
v___x_352_ = lean_box(0);
return v___x_352_;
}
else
{
lean_object* v_val_353_; lean_object* v___x_355_; uint8_t v_isShared_356_; uint8_t v_isSharedCheck_370_; 
v_val_353_ = lean_ctor_get(v___x_351_, 0);
v_isSharedCheck_370_ = !lean_is_exclusive(v___x_351_);
if (v_isSharedCheck_370_ == 0)
{
v___x_355_ = v___x_351_;
v_isShared_356_ = v_isSharedCheck_370_;
goto v_resetjp_354_;
}
else
{
lean_inc(v_val_353_);
lean_dec(v___x_351_);
v___x_355_ = lean_box(0);
v_isShared_356_ = v_isSharedCheck_370_;
goto v_resetjp_354_;
}
v_resetjp_354_:
{
lean_object* v_fst_357_; lean_object* v_snd_358_; lean_object* v___x_360_; uint8_t v_isShared_361_; uint8_t v_isSharedCheck_369_; 
v_fst_357_ = lean_ctor_get(v_val_353_, 0);
v_snd_358_ = lean_ctor_get(v_val_353_, 1);
v_isSharedCheck_369_ = !lean_is_exclusive(v_val_353_);
if (v_isSharedCheck_369_ == 0)
{
v___x_360_ = v_val_353_;
v_isShared_361_ = v_isSharedCheck_369_;
goto v_resetjp_359_;
}
else
{
lean_inc(v_snd_358_);
lean_inc(v_fst_357_);
lean_dec(v_val_353_);
v___x_360_ = lean_box(0);
v_isShared_361_ = v_isSharedCheck_369_;
goto v_resetjp_359_;
}
v_resetjp_359_:
{
lean_object* v___x_362_; lean_object* v___x_364_; 
v___x_362_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_362_, 0, v_fst_357_);
if (v_isShared_361_ == 0)
{
lean_ctor_set(v___x_360_, 0, v___x_362_);
v___x_364_ = v___x_360_;
goto v_reusejp_363_;
}
else
{
lean_object* v_reuseFailAlloc_368_; 
v_reuseFailAlloc_368_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_368_, 0, v___x_362_);
lean_ctor_set(v_reuseFailAlloc_368_, 1, v_snd_358_);
v___x_364_ = v_reuseFailAlloc_368_;
goto v_reusejp_363_;
}
v_reusejp_363_:
{
lean_object* v___x_366_; 
if (v_isShared_356_ == 0)
{
lean_ctor_set(v___x_355_, 0, v___x_364_);
v___x_366_ = v___x_355_;
goto v_reusejp_365_;
}
else
{
lean_object* v_reuseFailAlloc_367_; 
v_reuseFailAlloc_367_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_367_, 0, v___x_364_);
v___x_366_ = v_reuseFailAlloc_367_;
goto v_reusejp_365_;
}
v_reusejp_365_:
{
return v___x_366_;
}
}
}
}
}
}
}
else
{
lean_inc(v_tail_288_);
lean_dec_ref_known(v_x_282_, 2);
lean_dec_ref(v_numbers_280_);
if (lean_obj_tag(v_tail_288_) == 1)
{
lean_object* v_head_371_; lean_object* v_tail_372_; uint32_t v___x_373_; uint32_t v___x_374_; uint8_t v___x_375_; 
v_head_371_ = lean_ctor_get(v_tail_288_, 0);
lean_inc(v_head_371_);
v_tail_372_ = lean_ctor_get(v_tail_288_, 1);
lean_inc(v_tail_372_);
lean_dec_ref_known(v_tail_288_, 2);
v___x_373_ = 97;
v___x_374_ = lean_unbox_uint32(v_head_371_);
lean_dec(v_head_371_);
v___x_375_ = lean_uint32_dec_eq(v___x_374_, v___x_373_);
if (v___x_375_ == 0)
{
lean_object* v___x_376_; 
lean_dec(v_tail_372_);
v___x_376_ = lean_box(0);
return v___x_376_;
}
else
{
if (lean_obj_tag(v_tail_372_) == 1)
{
lean_object* v_head_377_; lean_object* v_tail_378_; uint32_t v___x_379_; uint32_t v___x_380_; uint8_t v___x_381_; 
v_head_377_ = lean_ctor_get(v_tail_372_, 0);
lean_inc(v_head_377_);
v_tail_378_ = lean_ctor_get(v_tail_372_, 1);
lean_inc(v_tail_378_);
lean_dec_ref_known(v_tail_372_, 2);
v___x_379_ = 108;
v___x_380_ = lean_unbox_uint32(v_head_377_);
lean_dec(v_head_377_);
v___x_381_ = lean_uint32_dec_eq(v___x_380_, v___x_379_);
if (v___x_381_ == 0)
{
lean_object* v___x_382_; 
lean_dec(v_tail_378_);
v___x_382_ = lean_box(0);
return v___x_382_;
}
else
{
if (lean_obj_tag(v_tail_378_) == 1)
{
lean_object* v_head_383_; lean_object* v_tail_384_; uint32_t v___x_385_; uint32_t v___x_386_; uint8_t v___x_387_; 
v_head_383_ = lean_ctor_get(v_tail_378_, 0);
lean_inc(v_head_383_);
v_tail_384_ = lean_ctor_get(v_tail_378_, 1);
lean_inc(v_tail_384_);
lean_dec_ref_known(v_tail_378_, 2);
v___x_385_ = 115;
v___x_386_ = lean_unbox_uint32(v_head_383_);
lean_dec(v_head_383_);
v___x_387_ = lean_uint32_dec_eq(v___x_386_, v___x_385_);
if (v___x_387_ == 0)
{
lean_object* v___x_388_; 
lean_dec(v_tail_384_);
v___x_388_ = lean_box(0);
return v___x_388_;
}
else
{
if (lean_obj_tag(v_tail_384_) == 1)
{
lean_object* v_head_389_; lean_object* v_tail_390_; lean_object* v___x_392_; uint8_t v_isShared_393_; uint8_t v_isSharedCheck_403_; 
v_head_389_ = lean_ctor_get(v_tail_384_, 0);
v_tail_390_ = lean_ctor_get(v_tail_384_, 1);
v_isSharedCheck_403_ = !lean_is_exclusive(v_tail_384_);
if (v_isSharedCheck_403_ == 0)
{
v___x_392_ = v_tail_384_;
v_isShared_393_ = v_isSharedCheck_403_;
goto v_resetjp_391_;
}
else
{
lean_inc(v_tail_390_);
lean_inc(v_head_389_);
lean_dec(v_tail_384_);
v___x_392_ = lean_box(0);
v_isShared_393_ = v_isSharedCheck_403_;
goto v_resetjp_391_;
}
v_resetjp_391_:
{
uint32_t v___x_394_; uint32_t v___x_395_; uint8_t v___x_396_; 
v___x_394_ = 101;
v___x_395_ = lean_unbox_uint32(v_head_389_);
lean_dec(v_head_389_);
v___x_396_ = lean_uint32_dec_eq(v___x_395_, v___x_394_);
if (v___x_396_ == 0)
{
lean_object* v___x_397_; 
lean_del_object(v___x_392_);
lean_dec(v_tail_390_);
v___x_397_ = lean_box(0);
return v___x_397_;
}
else
{
lean_object* v___x_398_; lean_object* v___x_400_; 
v___x_398_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_398_, 0, v___x_286_);
if (v_isShared_393_ == 0)
{
lean_ctor_set_tag(v___x_392_, 0);
lean_ctor_set(v___x_392_, 0, v___x_398_);
v___x_400_ = v___x_392_;
goto v_reusejp_399_;
}
else
{
lean_object* v_reuseFailAlloc_402_; 
v_reuseFailAlloc_402_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_402_, 0, v___x_398_);
lean_ctor_set(v_reuseFailAlloc_402_, 1, v_tail_390_);
v___x_400_ = v_reuseFailAlloc_402_;
goto v_reusejp_399_;
}
v_reusejp_399_:
{
lean_object* v___x_401_; 
v___x_401_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_401_, 0, v___x_400_);
return v___x_401_;
}
}
}
}
else
{
lean_object* v___x_404_; 
lean_dec(v_tail_384_);
v___x_404_ = lean_box(0);
return v___x_404_;
}
}
}
else
{
lean_object* v___x_405_; 
lean_dec(v_tail_378_);
v___x_405_ = lean_box(0);
return v___x_405_;
}
}
}
else
{
lean_object* v___x_406_; 
lean_dec(v_tail_372_);
v___x_406_ = lean_box(0);
return v___x_406_;
}
}
}
else
{
lean_object* v___x_407_; 
lean_dec(v_tail_288_);
v___x_407_ = lean_box(0);
return v___x_407_;
}
}
}
else
{
lean_inc(v_tail_288_);
lean_dec_ref_known(v_x_282_, 2);
lean_dec_ref(v_numbers_280_);
if (lean_obj_tag(v_tail_288_) == 1)
{
lean_object* v_head_408_; lean_object* v_tail_409_; uint32_t v___x_410_; uint32_t v___x_411_; uint8_t v___x_412_; 
v_head_408_ = lean_ctor_get(v_tail_288_, 0);
lean_inc(v_head_408_);
v_tail_409_ = lean_ctor_get(v_tail_288_, 1);
lean_inc(v_tail_409_);
lean_dec_ref_known(v_tail_288_, 2);
v___x_410_ = 114;
v___x_411_ = lean_unbox_uint32(v_head_408_);
lean_dec(v_head_408_);
v___x_412_ = lean_uint32_dec_eq(v___x_411_, v___x_410_);
if (v___x_412_ == 0)
{
lean_object* v___x_413_; 
lean_dec(v_tail_409_);
v___x_413_ = lean_box(0);
return v___x_413_;
}
else
{
if (lean_obj_tag(v_tail_409_) == 1)
{
lean_object* v_head_414_; lean_object* v_tail_415_; uint32_t v___x_416_; uint32_t v___x_417_; uint8_t v___x_418_; 
v_head_414_ = lean_ctor_get(v_tail_409_, 0);
lean_inc(v_head_414_);
v_tail_415_ = lean_ctor_get(v_tail_409_, 1);
lean_inc(v_tail_415_);
lean_dec_ref_known(v_tail_409_, 2);
v___x_416_ = 117;
v___x_417_ = lean_unbox_uint32(v_head_414_);
lean_dec(v_head_414_);
v___x_418_ = lean_uint32_dec_eq(v___x_417_, v___x_416_);
if (v___x_418_ == 0)
{
lean_object* v___x_419_; 
lean_dec(v_tail_415_);
v___x_419_ = lean_box(0);
return v___x_419_;
}
else
{
if (lean_obj_tag(v_tail_415_) == 1)
{
lean_object* v_head_420_; lean_object* v_tail_421_; lean_object* v___x_423_; uint8_t v_isShared_424_; uint8_t v_isSharedCheck_434_; 
v_head_420_ = lean_ctor_get(v_tail_415_, 0);
v_tail_421_ = lean_ctor_get(v_tail_415_, 1);
v_isSharedCheck_434_ = !lean_is_exclusive(v_tail_415_);
if (v_isSharedCheck_434_ == 0)
{
v___x_423_ = v_tail_415_;
v_isShared_424_ = v_isSharedCheck_434_;
goto v_resetjp_422_;
}
else
{
lean_inc(v_tail_421_);
lean_inc(v_head_420_);
lean_dec(v_tail_415_);
v___x_423_ = lean_box(0);
v_isShared_424_ = v_isSharedCheck_434_;
goto v_resetjp_422_;
}
v_resetjp_422_:
{
uint32_t v___x_425_; uint32_t v___x_426_; uint8_t v___x_427_; 
v___x_425_ = 101;
v___x_426_ = lean_unbox_uint32(v_head_420_);
lean_dec(v_head_420_);
v___x_427_ = lean_uint32_dec_eq(v___x_426_, v___x_425_);
if (v___x_427_ == 0)
{
lean_object* v___x_428_; 
lean_del_object(v___x_423_);
lean_dec(v_tail_421_);
v___x_428_ = lean_box(0);
return v___x_428_;
}
else
{
lean_object* v___x_429_; lean_object* v___x_431_; 
v___x_429_ = ((lean_object*)(lp_algalVerification_Algal_Core_JsonLayout_readValue___closed__0));
if (v_isShared_424_ == 0)
{
lean_ctor_set_tag(v___x_423_, 0);
lean_ctor_set(v___x_423_, 0, v___x_429_);
v___x_431_ = v___x_423_;
goto v_reusejp_430_;
}
else
{
lean_object* v_reuseFailAlloc_433_; 
v_reuseFailAlloc_433_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_433_, 0, v___x_429_);
lean_ctor_set(v_reuseFailAlloc_433_, 1, v_tail_421_);
v___x_431_ = v_reuseFailAlloc_433_;
goto v_reusejp_430_;
}
v_reusejp_430_:
{
lean_object* v___x_432_; 
v___x_432_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_432_, 0, v___x_431_);
return v___x_432_;
}
}
}
}
else
{
lean_object* v___x_435_; 
lean_dec(v_tail_415_);
v___x_435_ = lean_box(0);
return v___x_435_;
}
}
}
else
{
lean_object* v___x_436_; 
lean_dec(v_tail_409_);
v___x_436_ = lean_box(0);
return v___x_436_;
}
}
}
else
{
lean_object* v___x_437_; 
lean_dec(v_tail_288_);
v___x_437_ = lean_box(0);
return v___x_437_;
}
}
}
else
{
lean_inc(v_tail_288_);
lean_dec_ref_known(v_x_282_, 2);
lean_dec_ref(v_numbers_280_);
if (lean_obj_tag(v_tail_288_) == 1)
{
lean_object* v_head_438_; lean_object* v_tail_439_; uint32_t v___x_440_; uint32_t v___x_441_; uint8_t v___x_442_; 
v_head_438_ = lean_ctor_get(v_tail_288_, 0);
lean_inc(v_head_438_);
v_tail_439_ = lean_ctor_get(v_tail_288_, 1);
lean_inc(v_tail_439_);
lean_dec_ref_known(v_tail_288_, 2);
v___x_440_ = 117;
v___x_441_ = lean_unbox_uint32(v_head_438_);
lean_dec(v_head_438_);
v___x_442_ = lean_uint32_dec_eq(v___x_441_, v___x_440_);
if (v___x_442_ == 0)
{
lean_object* v___x_443_; 
lean_dec(v_tail_439_);
v___x_443_ = lean_box(0);
return v___x_443_;
}
else
{
if (lean_obj_tag(v_tail_439_) == 1)
{
lean_object* v_head_444_; lean_object* v_tail_445_; uint32_t v___x_446_; uint32_t v___x_447_; uint8_t v___x_448_; 
v_head_444_ = lean_ctor_get(v_tail_439_, 0);
lean_inc(v_head_444_);
v_tail_445_ = lean_ctor_get(v_tail_439_, 1);
lean_inc(v_tail_445_);
lean_dec_ref_known(v_tail_439_, 2);
v___x_446_ = 108;
v___x_447_ = lean_unbox_uint32(v_head_444_);
lean_dec(v_head_444_);
v___x_448_ = lean_uint32_dec_eq(v___x_447_, v___x_446_);
if (v___x_448_ == 0)
{
lean_object* v___x_449_; 
lean_dec(v_tail_445_);
v___x_449_ = lean_box(0);
return v___x_449_;
}
else
{
if (lean_obj_tag(v_tail_445_) == 1)
{
lean_object* v_head_450_; lean_object* v_tail_451_; lean_object* v___x_453_; uint8_t v_isShared_454_; uint8_t v_isSharedCheck_463_; 
v_head_450_ = lean_ctor_get(v_tail_445_, 0);
v_tail_451_ = lean_ctor_get(v_tail_445_, 1);
v_isSharedCheck_463_ = !lean_is_exclusive(v_tail_445_);
if (v_isSharedCheck_463_ == 0)
{
v___x_453_ = v_tail_445_;
v_isShared_454_ = v_isSharedCheck_463_;
goto v_resetjp_452_;
}
else
{
lean_inc(v_tail_451_);
lean_inc(v_head_450_);
lean_dec(v_tail_445_);
v___x_453_ = lean_box(0);
v_isShared_454_ = v_isSharedCheck_463_;
goto v_resetjp_452_;
}
v_resetjp_452_:
{
uint32_t v___x_455_; uint8_t v___x_456_; 
v___x_455_ = lean_unbox_uint32(v_head_450_);
lean_dec(v_head_450_);
v___x_456_ = lean_uint32_dec_eq(v___x_455_, v___x_446_);
if (v___x_456_ == 0)
{
lean_object* v___x_457_; 
lean_del_object(v___x_453_);
lean_dec(v_tail_451_);
v___x_457_ = lean_box(0);
return v___x_457_;
}
else
{
lean_object* v___x_458_; lean_object* v___x_460_; 
v___x_458_ = lean_box(0);
if (v_isShared_454_ == 0)
{
lean_ctor_set_tag(v___x_453_, 0);
lean_ctor_set(v___x_453_, 0, v___x_458_);
v___x_460_ = v___x_453_;
goto v_reusejp_459_;
}
else
{
lean_object* v_reuseFailAlloc_462_; 
v_reuseFailAlloc_462_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_462_, 0, v___x_458_);
lean_ctor_set(v_reuseFailAlloc_462_, 1, v_tail_451_);
v___x_460_ = v_reuseFailAlloc_462_;
goto v_reusejp_459_;
}
v_reusejp_459_:
{
lean_object* v___x_461_; 
v___x_461_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_461_, 0, v___x_460_);
return v___x_461_;
}
}
}
}
else
{
lean_object* v___x_464_; 
lean_dec(v_tail_445_);
v___x_464_ = lean_box(0);
return v___x_464_;
}
}
}
else
{
lean_object* v___x_465_; 
lean_dec(v_tail_439_);
v___x_465_ = lean_box(0);
return v___x_465_;
}
}
}
else
{
lean_object* v___x_466_; 
lean_dec(v_tail_288_);
v___x_466_ = lean_box(0);
return v___x_466_;
}
}
}
else
{
lean_object* v___x_467_; 
lean_dec(v_x_282_);
lean_dec_ref(v_numbers_280_);
v___x_467_ = lean_box(0);
return v___x_467_;
}
}
else
{
lean_object* v_read_468_; lean_object* v___x_469_; 
v_read_468_ = lean_ctor_get(v_numbers_280_, 1);
lean_inc_ref(v_read_468_);
lean_dec_ref(v_numbers_280_);
v___x_469_ = lean_apply_1(v_read_468_, v_x_282_);
if (lean_obj_tag(v___x_469_) == 0)
{
lean_object* v___x_470_; 
v___x_470_ = lean_box(0);
return v___x_470_;
}
else
{
lean_object* v_val_471_; lean_object* v___x_473_; uint8_t v_isShared_474_; uint8_t v_isSharedCheck_489_; 
v_val_471_ = lean_ctor_get(v___x_469_, 0);
v_isSharedCheck_489_ = !lean_is_exclusive(v___x_469_);
if (v_isSharedCheck_489_ == 0)
{
v___x_473_ = v___x_469_;
v_isShared_474_ = v_isSharedCheck_489_;
goto v_resetjp_472_;
}
else
{
lean_inc(v_val_471_);
lean_dec(v___x_469_);
v___x_473_ = lean_box(0);
v_isShared_474_ = v_isSharedCheck_489_;
goto v_resetjp_472_;
}
v_resetjp_472_:
{
lean_object* v_fst_475_; lean_object* v_snd_476_; lean_object* v___x_478_; uint8_t v_isShared_479_; uint8_t v_isSharedCheck_488_; 
v_fst_475_ = lean_ctor_get(v_val_471_, 0);
v_snd_476_ = lean_ctor_get(v_val_471_, 1);
v_isSharedCheck_488_ = !lean_is_exclusive(v_val_471_);
if (v_isSharedCheck_488_ == 0)
{
v___x_478_ = v_val_471_;
v_isShared_479_ = v_isSharedCheck_488_;
goto v_resetjp_477_;
}
else
{
lean_inc(v_snd_476_);
lean_inc(v_fst_475_);
lean_dec(v_val_471_);
v___x_478_ = lean_box(0);
v_isShared_479_ = v_isSharedCheck_488_;
goto v_resetjp_477_;
}
v_resetjp_477_:
{
lean_object* v___x_480_; uint64_t v___x_481_; lean_object* v___x_483_; 
v___x_480_ = lean_alloc_ctor(2, 0, 8);
v___x_481_ = lean_unbox_uint64(v_fst_475_);
lean_dec(v_fst_475_);
lean_ctor_set_uint64(v___x_480_, 0, v___x_481_);
if (v_isShared_479_ == 0)
{
lean_ctor_set(v___x_478_, 0, v___x_480_);
v___x_483_ = v___x_478_;
goto v_reusejp_482_;
}
else
{
lean_object* v_reuseFailAlloc_487_; 
v_reuseFailAlloc_487_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_487_, 0, v___x_480_);
lean_ctor_set(v_reuseFailAlloc_487_, 1, v_snd_476_);
v___x_483_ = v_reuseFailAlloc_487_;
goto v_reusejp_482_;
}
v_reusejp_482_:
{
lean_object* v___x_485_; 
if (v_isShared_474_ == 0)
{
lean_ctor_set(v___x_473_, 0, v___x_483_);
v___x_485_ = v___x_473_;
goto v_reusejp_484_;
}
else
{
lean_object* v_reuseFailAlloc_486_; 
v_reuseFailAlloc_486_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_486_, 0, v___x_483_);
v___x_485_ = v_reuseFailAlloc_486_;
goto v_reusejp_484_;
}
v_reusejp_484_:
{
return v___x_485_;
}
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readItems(lean_object* v_numbers_490_, lean_object* v_x_491_, uint8_t v_x_492_, lean_object* v_x_493_){
_start:
{
lean_object* v_zero_494_; uint8_t v_isZero_495_; 
v_zero_494_ = lean_unsigned_to_nat(0u);
v_isZero_495_ = lean_nat_dec_eq(v_x_491_, v_zero_494_);
if (v_isZero_495_ == 1)
{
lean_object* v___x_496_; 
lean_dec(v_x_493_);
lean_dec_ref(v_numbers_490_);
v___x_496_ = lean_box(0);
return v___x_496_;
}
else
{
lean_object* v_one_497_; lean_object* v_n_498_; 
v_one_497_ = lean_unsigned_to_nat(1u);
v_n_498_ = lean_nat_sub(v_x_491_, v_one_497_);
if (v_x_492_ == 0)
{
goto v___jp_499_;
}
else
{
lean_object* v___x_559_; lean_object* v___x_560_; lean_object* v___x_561_; uint8_t v___x_562_; 
v___x_559_ = lean_alloc_closure((void*)(l_instDecidableEqChar___boxed), 2, 0);
v___x_560_ = l_List_head_x3f___redArg(v_x_493_);
v___x_561_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonLayout_readItems___closed__0, &lp_algalVerification_Algal_Core_JsonLayout_readItems___closed__0_once, _init_lp_algalVerification_Algal_Core_JsonLayout_readItems___closed__0);
v___x_562_ = l_Option_instDecidableEq___redArg(v___x_559_, v___x_560_, v___x_561_);
if (v___x_562_ == 0)
{
goto v___jp_499_;
}
else
{
lean_object* v___x_563_; lean_object* v___y_565_; 
lean_dec(v_n_498_);
lean_dec_ref(v_numbers_490_);
v___x_563_ = lean_box(0);
if (lean_obj_tag(v_x_493_) == 0)
{
v___y_565_ = v_x_493_;
goto v___jp_564_;
}
else
{
lean_object* v_tail_568_; 
v_tail_568_ = lean_ctor_get(v_x_493_, 1);
lean_inc(v_tail_568_);
lean_dec_ref_known(v_x_493_, 2);
v___y_565_ = v_tail_568_;
goto v___jp_564_;
}
v___jp_564_:
{
lean_object* v___x_566_; lean_object* v___x_567_; 
v___x_566_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_566_, 0, v___x_563_);
lean_ctor_set(v___x_566_, 1, v___y_565_);
v___x_567_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_567_, 0, v___x_566_);
return v___x_567_;
}
}
}
v___jp_499_:
{
lean_object* v___x_500_; 
lean_inc_ref(v_numbers_490_);
v___x_500_ = lp_algalVerification_Algal_Core_JsonLayout_readValue(v_numbers_490_, v_n_498_, v_x_493_);
if (lean_obj_tag(v___x_500_) == 0)
{
lean_object* v___x_501_; 
lean_dec(v_n_498_);
lean_dec_ref(v_numbers_490_);
v___x_501_ = lean_box(0);
return v___x_501_;
}
else
{
lean_object* v_val_502_; lean_object* v___x_504_; uint8_t v_isShared_505_; uint8_t v_isSharedCheck_558_; 
v_val_502_ = lean_ctor_get(v___x_500_, 0);
v_isSharedCheck_558_ = !lean_is_exclusive(v___x_500_);
if (v_isSharedCheck_558_ == 0)
{
v___x_504_ = v___x_500_;
v_isShared_505_ = v_isSharedCheck_558_;
goto v_resetjp_503_;
}
else
{
lean_inc(v_val_502_);
lean_dec(v___x_500_);
v___x_504_ = lean_box(0);
v_isShared_505_ = v_isSharedCheck_558_;
goto v_resetjp_503_;
}
v_resetjp_503_:
{
lean_object* v_snd_506_; 
v_snd_506_ = lean_ctor_get(v_val_502_, 1);
lean_inc(v_snd_506_);
if (lean_obj_tag(v_snd_506_) == 1)
{
lean_object* v_fst_507_; lean_object* v___x_509_; uint8_t v_isShared_510_; uint8_t v_isSharedCheck_555_; 
v_fst_507_ = lean_ctor_get(v_val_502_, 0);
v_isSharedCheck_555_ = !lean_is_exclusive(v_val_502_);
if (v_isSharedCheck_555_ == 0)
{
lean_object* v_unused_556_; 
v_unused_556_ = lean_ctor_get(v_val_502_, 1);
lean_dec(v_unused_556_);
v___x_509_ = v_val_502_;
v_isShared_510_ = v_isSharedCheck_555_;
goto v_resetjp_508_;
}
else
{
lean_inc(v_fst_507_);
lean_dec(v_val_502_);
v___x_509_ = lean_box(0);
v_isShared_510_ = v_isSharedCheck_555_;
goto v_resetjp_508_;
}
v_resetjp_508_:
{
lean_object* v_head_511_; lean_object* v_tail_512_; lean_object* v___x_514_; uint8_t v_isShared_515_; uint8_t v_isSharedCheck_554_; 
v_head_511_ = lean_ctor_get(v_snd_506_, 0);
v_tail_512_ = lean_ctor_get(v_snd_506_, 1);
v_isSharedCheck_554_ = !lean_is_exclusive(v_snd_506_);
if (v_isSharedCheck_554_ == 0)
{
v___x_514_ = v_snd_506_;
v_isShared_515_ = v_isSharedCheck_554_;
goto v_resetjp_513_;
}
else
{
lean_inc(v_tail_512_);
lean_inc(v_head_511_);
lean_dec(v_snd_506_);
v___x_514_ = lean_box(0);
v_isShared_515_ = v_isSharedCheck_554_;
goto v_resetjp_513_;
}
v_resetjp_513_:
{
uint32_t v___x_516_; uint32_t v___x_517_; uint8_t v___x_518_; 
v___x_516_ = 93;
v___x_517_ = lean_unbox_uint32(v_head_511_);
v___x_518_ = lean_uint32_dec_eq(v___x_517_, v___x_516_);
if (v___x_518_ == 0)
{
uint32_t v___x_519_; uint32_t v___x_520_; uint8_t v___x_521_; 
lean_del_object(v___x_509_);
lean_del_object(v___x_504_);
v___x_519_ = 44;
v___x_520_ = lean_unbox_uint32(v_head_511_);
lean_dec(v_head_511_);
v___x_521_ = lean_uint32_dec_eq(v___x_520_, v___x_519_);
if (v___x_521_ == 0)
{
lean_object* v___x_522_; 
lean_del_object(v___x_514_);
lean_dec(v_tail_512_);
lean_dec(v_fst_507_);
lean_dec(v_n_498_);
lean_dec_ref(v_numbers_490_);
v___x_522_ = lean_box(0);
return v___x_522_;
}
else
{
lean_object* v___x_523_; 
v___x_523_ = lp_algalVerification_Algal_Core_JsonLayout_readItems(v_numbers_490_, v_n_498_, v___x_518_, v_tail_512_);
lean_dec(v_n_498_);
if (lean_obj_tag(v___x_523_) == 0)
{
lean_del_object(v___x_514_);
lean_dec(v_fst_507_);
return v___x_523_;
}
else
{
lean_object* v_val_524_; lean_object* v___x_526_; uint8_t v_isShared_527_; uint8_t v_isSharedCheck_543_; 
v_val_524_ = lean_ctor_get(v___x_523_, 0);
v_isSharedCheck_543_ = !lean_is_exclusive(v___x_523_);
if (v_isSharedCheck_543_ == 0)
{
v___x_526_ = v___x_523_;
v_isShared_527_ = v_isSharedCheck_543_;
goto v_resetjp_525_;
}
else
{
lean_inc(v_val_524_);
lean_dec(v___x_523_);
v___x_526_ = lean_box(0);
v_isShared_527_ = v_isSharedCheck_543_;
goto v_resetjp_525_;
}
v_resetjp_525_:
{
lean_object* v_fst_528_; lean_object* v_snd_529_; lean_object* v___x_531_; uint8_t v_isShared_532_; uint8_t v_isSharedCheck_542_; 
v_fst_528_ = lean_ctor_get(v_val_524_, 0);
v_snd_529_ = lean_ctor_get(v_val_524_, 1);
v_isSharedCheck_542_ = !lean_is_exclusive(v_val_524_);
if (v_isSharedCheck_542_ == 0)
{
v___x_531_ = v_val_524_;
v_isShared_532_ = v_isSharedCheck_542_;
goto v_resetjp_530_;
}
else
{
lean_inc(v_snd_529_);
lean_inc(v_fst_528_);
lean_dec(v_val_524_);
v___x_531_ = lean_box(0);
v_isShared_532_ = v_isSharedCheck_542_;
goto v_resetjp_530_;
}
v_resetjp_530_:
{
lean_object* v___x_534_; 
if (v_isShared_515_ == 0)
{
lean_ctor_set(v___x_514_, 1, v_fst_528_);
lean_ctor_set(v___x_514_, 0, v_fst_507_);
v___x_534_ = v___x_514_;
goto v_reusejp_533_;
}
else
{
lean_object* v_reuseFailAlloc_541_; 
v_reuseFailAlloc_541_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_541_, 0, v_fst_507_);
lean_ctor_set(v_reuseFailAlloc_541_, 1, v_fst_528_);
v___x_534_ = v_reuseFailAlloc_541_;
goto v_reusejp_533_;
}
v_reusejp_533_:
{
lean_object* v___x_536_; 
if (v_isShared_532_ == 0)
{
lean_ctor_set(v___x_531_, 0, v___x_534_);
v___x_536_ = v___x_531_;
goto v_reusejp_535_;
}
else
{
lean_object* v_reuseFailAlloc_540_; 
v_reuseFailAlloc_540_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_540_, 0, v___x_534_);
lean_ctor_set(v_reuseFailAlloc_540_, 1, v_snd_529_);
v___x_536_ = v_reuseFailAlloc_540_;
goto v_reusejp_535_;
}
v_reusejp_535_:
{
lean_object* v___x_538_; 
if (v_isShared_527_ == 0)
{
lean_ctor_set(v___x_526_, 0, v___x_536_);
v___x_538_ = v___x_526_;
goto v_reusejp_537_;
}
else
{
lean_object* v_reuseFailAlloc_539_; 
v_reuseFailAlloc_539_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_539_, 0, v___x_536_);
v___x_538_ = v_reuseFailAlloc_539_;
goto v_reusejp_537_;
}
v_reusejp_537_:
{
return v___x_538_;
}
}
}
}
}
}
}
}
else
{
lean_object* v___x_544_; lean_object* v___x_546_; 
lean_dec(v_head_511_);
lean_dec(v_n_498_);
lean_dec_ref(v_numbers_490_);
v___x_544_ = lean_box(0);
if (v_isShared_515_ == 0)
{
lean_ctor_set(v___x_514_, 1, v___x_544_);
lean_ctor_set(v___x_514_, 0, v_fst_507_);
v___x_546_ = v___x_514_;
goto v_reusejp_545_;
}
else
{
lean_object* v_reuseFailAlloc_553_; 
v_reuseFailAlloc_553_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_553_, 0, v_fst_507_);
lean_ctor_set(v_reuseFailAlloc_553_, 1, v___x_544_);
v___x_546_ = v_reuseFailAlloc_553_;
goto v_reusejp_545_;
}
v_reusejp_545_:
{
lean_object* v___x_548_; 
if (v_isShared_510_ == 0)
{
lean_ctor_set(v___x_509_, 1, v_tail_512_);
lean_ctor_set(v___x_509_, 0, v___x_546_);
v___x_548_ = v___x_509_;
goto v_reusejp_547_;
}
else
{
lean_object* v_reuseFailAlloc_552_; 
v_reuseFailAlloc_552_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_552_, 0, v___x_546_);
lean_ctor_set(v_reuseFailAlloc_552_, 1, v_tail_512_);
v___x_548_ = v_reuseFailAlloc_552_;
goto v_reusejp_547_;
}
v_reusejp_547_:
{
lean_object* v___x_550_; 
if (v_isShared_505_ == 0)
{
lean_ctor_set(v___x_504_, 0, v___x_548_);
v___x_550_ = v___x_504_;
goto v_reusejp_549_;
}
else
{
lean_object* v_reuseFailAlloc_551_; 
v_reuseFailAlloc_551_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_551_, 0, v___x_548_);
v___x_550_ = v_reuseFailAlloc_551_;
goto v_reusejp_549_;
}
v_reusejp_549_:
{
return v___x_550_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_557_; 
lean_dec(v_snd_506_);
lean_del_object(v___x_504_);
lean_dec(v_val_502_);
lean_dec(v_n_498_);
lean_dec_ref(v_numbers_490_);
v___x_557_ = lean_box(0);
return v___x_557_;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readItems___boxed(lean_object* v_numbers_569_, lean_object* v_x_570_, lean_object* v_x_571_, lean_object* v_x_572_){
_start:
{
uint8_t v_x_2008__boxed_573_; lean_object* v_res_574_; 
v_x_2008__boxed_573_ = lean_unbox(v_x_571_);
v_res_574_ = lp_algalVerification_Algal_Core_JsonLayout_readItems(v_numbers_569_, v_x_570_, v_x_2008__boxed_573_, v_x_572_);
lean_dec(v_x_570_);
return v_res_574_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readFields___boxed(lean_object* v_numbers_575_, lean_object* v_x_576_, lean_object* v_x_577_, lean_object* v_x_578_){
_start:
{
uint8_t v_x_2051__boxed_579_; lean_object* v_res_580_; 
v_x_2051__boxed_579_ = lean_unbox(v_x_577_);
v_res_580_ = lp_algalVerification_Algal_Core_JsonLayout_readFields(v_numbers_575_, v_x_576_, v_x_2051__boxed_579_, v_x_578_);
lean_dec(v_x_576_);
return v_res_580_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readValue___boxed(lean_object* v_numbers_581_, lean_object* v_x_582_, lean_object* v_x_583_){
_start:
{
lean_object* v_res_584_; 
v_res_584_ = lp_algalVerification_Algal_Core_JsonLayout_readValue(v_numbers_581_, v_x_582_, v_x_583_);
lean_dec(v_x_582_);
return v_res_584_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_numericHead_match__1_splitter___redArg(lean_object* v_input_585_, lean_object* v_h__1_586_, lean_object* v_h__2_587_){
_start:
{
if (lean_obj_tag(v_input_585_) == 0)
{
lean_object* v___x_588_; lean_object* v___x_589_; 
lean_dec(v_h__1_586_);
v___x_588_ = lean_box(0);
v___x_589_ = lean_apply_1(v_h__2_587_, v___x_588_);
return v___x_589_;
}
else
{
lean_object* v_head_590_; lean_object* v_tail_591_; lean_object* v___x_592_; 
lean_dec(v_h__2_587_);
v_head_590_ = lean_ctor_get(v_input_585_, 0);
lean_inc(v_head_590_);
v_tail_591_ = lean_ctor_get(v_input_585_, 1);
lean_inc(v_tail_591_);
lean_dec_ref_known(v_input_585_, 2);
v___x_592_ = lean_apply_2(v_h__1_586_, v_head_590_, v_tail_591_);
return v___x_592_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_numericHead_match__1_splitter(lean_object* v_motive_593_, lean_object* v_input_594_, lean_object* v_h__1_595_, lean_object* v_h__2_596_){
_start:
{
if (lean_obj_tag(v_input_594_) == 0)
{
lean_object* v___x_597_; lean_object* v___x_598_; 
lean_dec(v_h__1_595_);
v___x_597_ = lean_box(0);
v___x_598_ = lean_apply_1(v_h__2_596_, v___x_597_);
return v___x_598_;
}
else
{
lean_object* v_head_599_; lean_object* v_tail_600_; lean_object* v___x_601_; 
lean_dec(v_h__2_596_);
v_head_599_ = lean_ctor_get(v_input_594_, 0);
lean_inc(v_head_599_);
v_tail_600_ = lean_ctor_get(v_input_594_, 1);
lean_inc(v_tail_600_);
lean_dec_ref_known(v_input_594_, 2);
v___x_601_ = lean_apply_2(v_h__1_595_, v_head_599_, v_tail_600_);
return v___x_601_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_render_match__1_splitter___redArg(lean_object* v_x_602_, lean_object* v_h__1_603_, lean_object* v_h__2_604_, lean_object* v_h__3_605_, lean_object* v_h__4_606_, lean_object* v_h__5_607_, lean_object* v_h__6_608_, lean_object* v_h__7_609_){
_start:
{
switch(lean_obj_tag(v_x_602_))
{
case 0:
{
lean_object* v___x_610_; lean_object* v___x_611_; 
lean_dec(v_h__7_609_);
lean_dec(v_h__6_608_);
lean_dec(v_h__5_607_);
lean_dec(v_h__4_606_);
lean_dec(v_h__3_605_);
lean_dec(v_h__2_604_);
v___x_610_ = lean_box(0);
v___x_611_ = lean_apply_1(v_h__1_603_, v___x_610_);
return v___x_611_;
}
case 1:
{
uint8_t v_value_612_; 
lean_dec(v_h__7_609_);
lean_dec(v_h__6_608_);
lean_dec(v_h__5_607_);
lean_dec(v_h__4_606_);
lean_dec(v_h__1_603_);
v_value_612_ = lean_ctor_get_uint8(v_x_602_, 0);
lean_dec_ref_known(v_x_602_, 0);
if (v_value_612_ == 0)
{
lean_object* v___x_613_; lean_object* v___x_614_; 
lean_dec(v_h__2_604_);
v___x_613_ = lean_box(0);
v___x_614_ = lean_apply_1(v_h__3_605_, v___x_613_);
return v___x_614_;
}
else
{
lean_object* v___x_615_; lean_object* v___x_616_; 
lean_dec(v_h__3_605_);
v___x_615_ = lean_box(0);
v___x_616_ = lean_apply_1(v_h__2_604_, v___x_615_);
return v___x_616_;
}
}
case 2:
{
uint64_t v_value_617_; lean_object* v___x_618_; lean_object* v___x_619_; 
lean_dec(v_h__7_609_);
lean_dec(v_h__6_608_);
lean_dec(v_h__5_607_);
lean_dec(v_h__3_605_);
lean_dec(v_h__2_604_);
lean_dec(v_h__1_603_);
v_value_617_ = lean_ctor_get_uint64(v_x_602_, 0);
lean_dec_ref_known(v_x_602_, 0);
v___x_618_ = lean_box_uint64(v_value_617_);
v___x_619_ = lean_apply_1(v_h__4_606_, v___x_618_);
return v___x_619_;
}
case 3:
{
lean_object* v_value_620_; lean_object* v___x_621_; 
lean_dec(v_h__7_609_);
lean_dec(v_h__6_608_);
lean_dec(v_h__4_606_);
lean_dec(v_h__3_605_);
lean_dec(v_h__2_604_);
lean_dec(v_h__1_603_);
v_value_620_ = lean_ctor_get(v_x_602_, 0);
lean_inc_ref(v_value_620_);
lean_dec_ref_known(v_x_602_, 1);
v___x_621_ = lean_apply_1(v_h__5_607_, v_value_620_);
return v___x_621_;
}
case 4:
{
lean_object* v_values_622_; lean_object* v___x_623_; 
lean_dec(v_h__7_609_);
lean_dec(v_h__5_607_);
lean_dec(v_h__4_606_);
lean_dec(v_h__3_605_);
lean_dec(v_h__2_604_);
lean_dec(v_h__1_603_);
v_values_622_ = lean_ctor_get(v_x_602_, 0);
lean_inc(v_values_622_);
lean_dec_ref_known(v_x_602_, 1);
v___x_623_ = lean_apply_1(v_h__6_608_, v_values_622_);
return v___x_623_;
}
default: 
{
lean_object* v_fields_624_; lean_object* v___x_625_; 
lean_dec(v_h__6_608_);
lean_dec(v_h__5_607_);
lean_dec(v_h__4_606_);
lean_dec(v_h__3_605_);
lean_dec(v_h__2_604_);
lean_dec(v_h__1_603_);
v_fields_624_ = lean_ctor_get(v_x_602_, 0);
lean_inc(v_fields_624_);
lean_dec_ref_known(v_x_602_, 1);
v___x_625_ = lean_apply_1(v_h__7_609_, v_fields_624_);
return v___x_625_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_render_match__1_splitter(lean_object* v_motive_626_, lean_object* v_x_627_, lean_object* v_h__1_628_, lean_object* v_h__2_629_, lean_object* v_h__3_630_, lean_object* v_h__4_631_, lean_object* v_h__5_632_, lean_object* v_h__6_633_, lean_object* v_h__7_634_){
_start:
{
switch(lean_obj_tag(v_x_627_))
{
case 0:
{
lean_object* v___x_635_; lean_object* v___x_636_; 
lean_dec(v_h__7_634_);
lean_dec(v_h__6_633_);
lean_dec(v_h__5_632_);
lean_dec(v_h__4_631_);
lean_dec(v_h__3_630_);
lean_dec(v_h__2_629_);
v___x_635_ = lean_box(0);
v___x_636_ = lean_apply_1(v_h__1_628_, v___x_635_);
return v___x_636_;
}
case 1:
{
uint8_t v_value_637_; 
lean_dec(v_h__7_634_);
lean_dec(v_h__6_633_);
lean_dec(v_h__5_632_);
lean_dec(v_h__4_631_);
lean_dec(v_h__1_628_);
v_value_637_ = lean_ctor_get_uint8(v_x_627_, 0);
lean_dec_ref_known(v_x_627_, 0);
if (v_value_637_ == 0)
{
lean_object* v___x_638_; lean_object* v___x_639_; 
lean_dec(v_h__2_629_);
v___x_638_ = lean_box(0);
v___x_639_ = lean_apply_1(v_h__3_630_, v___x_638_);
return v___x_639_;
}
else
{
lean_object* v___x_640_; lean_object* v___x_641_; 
lean_dec(v_h__3_630_);
v___x_640_ = lean_box(0);
v___x_641_ = lean_apply_1(v_h__2_629_, v___x_640_);
return v___x_641_;
}
}
case 2:
{
uint64_t v_value_642_; lean_object* v___x_643_; lean_object* v___x_644_; 
lean_dec(v_h__7_634_);
lean_dec(v_h__6_633_);
lean_dec(v_h__5_632_);
lean_dec(v_h__3_630_);
lean_dec(v_h__2_629_);
lean_dec(v_h__1_628_);
v_value_642_ = lean_ctor_get_uint64(v_x_627_, 0);
lean_dec_ref_known(v_x_627_, 0);
v___x_643_ = lean_box_uint64(v_value_642_);
v___x_644_ = lean_apply_1(v_h__4_631_, v___x_643_);
return v___x_644_;
}
case 3:
{
lean_object* v_value_645_; lean_object* v___x_646_; 
lean_dec(v_h__7_634_);
lean_dec(v_h__6_633_);
lean_dec(v_h__4_631_);
lean_dec(v_h__3_630_);
lean_dec(v_h__2_629_);
lean_dec(v_h__1_628_);
v_value_645_ = lean_ctor_get(v_x_627_, 0);
lean_inc_ref(v_value_645_);
lean_dec_ref_known(v_x_627_, 1);
v___x_646_ = lean_apply_1(v_h__5_632_, v_value_645_);
return v___x_646_;
}
case 4:
{
lean_object* v_values_647_; lean_object* v___x_648_; 
lean_dec(v_h__7_634_);
lean_dec(v_h__5_632_);
lean_dec(v_h__4_631_);
lean_dec(v_h__3_630_);
lean_dec(v_h__2_629_);
lean_dec(v_h__1_628_);
v_values_647_ = lean_ctor_get(v_x_627_, 0);
lean_inc(v_values_647_);
lean_dec_ref_known(v_x_627_, 1);
v___x_648_ = lean_apply_1(v_h__6_633_, v_values_647_);
return v___x_648_;
}
default: 
{
lean_object* v_fields_649_; lean_object* v___x_650_; 
lean_dec(v_h__6_633_);
lean_dec(v_h__5_632_);
lean_dec(v_h__4_631_);
lean_dec(v_h__3_630_);
lean_dec(v_h__2_629_);
lean_dec(v_h__1_628_);
v_fields_649_ = lean_ctor_get(v_x_627_, 0);
lean_inc(v_fields_649_);
lean_dec_ref_known(v_x_627_, 1);
v___x_650_ = lean_apply_1(v_h__7_634_, v_fields_649_);
return v___x_650_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_weight_match__1_splitter___redArg(lean_object* v_x_651_, lean_object* v_h__1_652_, lean_object* v_h__2_653_, lean_object* v_h__3_654_){
_start:
{
switch(lean_obj_tag(v_x_651_))
{
case 4:
{
lean_object* v_values_655_; lean_object* v___x_656_; 
lean_dec(v_h__3_654_);
lean_dec(v_h__2_653_);
v_values_655_ = lean_ctor_get(v_x_651_, 0);
lean_inc(v_values_655_);
lean_dec_ref_known(v_x_651_, 1);
v___x_656_ = lean_apply_1(v_h__1_652_, v_values_655_);
return v___x_656_;
}
case 5:
{
lean_object* v_fields_657_; lean_object* v___x_658_; 
lean_dec(v_h__3_654_);
lean_dec(v_h__1_652_);
v_fields_657_ = lean_ctor_get(v_x_651_, 0);
lean_inc(v_fields_657_);
lean_dec_ref_known(v_x_651_, 1);
v___x_658_ = lean_apply_1(v_h__2_653_, v_fields_657_);
return v___x_658_;
}
default: 
{
lean_object* v___x_659_; 
lean_dec(v_h__2_653_);
lean_dec(v_h__1_652_);
v___x_659_ = lean_apply_3(v_h__3_654_, v_x_651_, lean_box(0), lean_box(0));
return v___x_659_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_weight_match__1_splitter(lean_object* v_motive_660_, lean_object* v_x_661_, lean_object* v_h__1_662_, lean_object* v_h__2_663_, lean_object* v_h__3_664_){
_start:
{
switch(lean_obj_tag(v_x_661_))
{
case 4:
{
lean_object* v_values_665_; lean_object* v___x_666_; 
lean_dec(v_h__3_664_);
lean_dec(v_h__2_663_);
v_values_665_ = lean_ctor_get(v_x_661_, 0);
lean_inc(v_values_665_);
lean_dec_ref_known(v_x_661_, 1);
v___x_666_ = lean_apply_1(v_h__1_662_, v_values_665_);
return v___x_666_;
}
case 5:
{
lean_object* v_fields_667_; lean_object* v___x_668_; 
lean_dec(v_h__3_664_);
lean_dec(v_h__1_662_);
v_fields_667_ = lean_ctor_get(v_x_661_, 0);
lean_inc(v_fields_667_);
lean_dec_ref_known(v_x_661_, 1);
v___x_668_ = lean_apply_1(v_h__2_663_, v_fields_667_);
return v___x_668_;
}
default: 
{
lean_object* v___x_669_; 
lean_dec(v_h__2_663_);
lean_dec(v_h__1_662_);
v___x_669_ = lean_apply_3(v_h__3_664_, v_x_661_, lean_box(0), lean_box(0));
return v___x_669_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__4_splitter___redArg(lean_object* v_x_670_, lean_object* v_x_671_, lean_object* v_h__1_672_, lean_object* v_h__2_673_){
_start:
{
lean_object* v_zero_674_; uint8_t v_isZero_675_; 
v_zero_674_ = lean_unsigned_to_nat(0u);
v_isZero_675_ = lean_nat_dec_eq(v_x_670_, v_zero_674_);
if (v_isZero_675_ == 1)
{
lean_object* v___x_676_; 
lean_dec(v_h__2_673_);
v___x_676_ = lean_apply_1(v_h__1_672_, v_x_671_);
return v___x_676_;
}
else
{
lean_object* v_one_677_; lean_object* v_n_678_; lean_object* v___x_679_; 
lean_dec(v_h__1_672_);
v_one_677_ = lean_unsigned_to_nat(1u);
v_n_678_ = lean_nat_sub(v_x_670_, v_one_677_);
v___x_679_ = lean_apply_2(v_h__2_673_, v_n_678_, v_x_671_);
return v___x_679_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__4_splitter___redArg___boxed(lean_object* v_x_680_, lean_object* v_x_681_, lean_object* v_h__1_682_, lean_object* v_h__2_683_){
_start:
{
lean_object* v_res_684_; 
v_res_684_ = lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__4_splitter___redArg(v_x_680_, v_x_681_, v_h__1_682_, v_h__2_683_);
lean_dec(v_x_680_);
return v_res_684_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__4_splitter(lean_object* v_motive_685_, lean_object* v_x_686_, lean_object* v_x_687_, lean_object* v_h__1_688_, lean_object* v_h__2_689_){
_start:
{
lean_object* v_zero_690_; uint8_t v_isZero_691_; 
v_zero_690_ = lean_unsigned_to_nat(0u);
v_isZero_691_ = lean_nat_dec_eq(v_x_686_, v_zero_690_);
if (v_isZero_691_ == 1)
{
lean_object* v___x_692_; 
lean_dec(v_h__2_689_);
v___x_692_ = lean_apply_1(v_h__1_688_, v_x_687_);
return v___x_692_;
}
else
{
lean_object* v_one_693_; lean_object* v_n_694_; lean_object* v___x_695_; 
lean_dec(v_h__1_688_);
v_one_693_ = lean_unsigned_to_nat(1u);
v_n_694_ = lean_nat_sub(v_x_686_, v_one_693_);
v___x_695_ = lean_apply_2(v_h__2_689_, v_n_694_, v_x_687_);
return v___x_695_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__4_splitter___boxed(lean_object* v_motive_696_, lean_object* v_x_697_, lean_object* v_x_698_, lean_object* v_h__1_699_, lean_object* v_h__2_700_){
_start:
{
lean_object* v_res_701_; 
v_res_701_ = lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__4_splitter(v_motive_696_, v_x_697_, v_x_698_, v_h__1_699_, v_h__2_700_);
lean_dec(v_x_697_);
return v_res_701_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__1_splitter___redArg(lean_object* v_input_702_, lean_object* v_h__1_703_, lean_object* v_h__2_704_, lean_object* v_h__3_705_, lean_object* v_h__4_706_, lean_object* v_h__5_707_, lean_object* v_h__6_708_, lean_object* v_h__7_709_){
_start:
{
if (lean_obj_tag(v_input_702_) == 1)
{
lean_object* v_head_710_; lean_object* v_tail_711_; uint32_t v___x_712_; uint32_t v___x_713_; uint8_t v___x_714_; 
v_head_710_ = lean_ctor_get(v_input_702_, 0);
v_tail_711_ = lean_ctor_get(v_input_702_, 1);
lean_inc(v_tail_711_);
v___x_712_ = 110;
v___x_713_ = lean_unbox_uint32(v_head_710_);
v___x_714_ = lean_uint32_dec_eq(v___x_713_, v___x_712_);
if (v___x_714_ == 0)
{
uint32_t v___x_715_; uint32_t v___x_716_; uint8_t v___x_717_; 
lean_dec(v_h__1_703_);
v___x_715_ = 116;
v___x_716_ = lean_unbox_uint32(v_head_710_);
v___x_717_ = lean_uint32_dec_eq(v___x_716_, v___x_715_);
if (v___x_717_ == 0)
{
uint32_t v___x_718_; uint32_t v___x_719_; uint8_t v___x_720_; 
lean_dec(v_h__2_704_);
v___x_718_ = 102;
v___x_719_ = lean_unbox_uint32(v_head_710_);
v___x_720_ = lean_uint32_dec_eq(v___x_719_, v___x_718_);
if (v___x_720_ == 0)
{
uint32_t v___x_721_; uint32_t v___x_722_; uint8_t v___x_723_; 
lean_dec(v_h__3_705_);
v___x_721_ = 34;
v___x_722_ = lean_unbox_uint32(v_head_710_);
v___x_723_ = lean_uint32_dec_eq(v___x_722_, v___x_721_);
if (v___x_723_ == 0)
{
uint32_t v___x_724_; uint32_t v___x_725_; uint8_t v___x_726_; 
lean_dec(v_h__4_706_);
v___x_724_ = 91;
v___x_725_ = lean_unbox_uint32(v_head_710_);
v___x_726_ = lean_uint32_dec_eq(v___x_725_, v___x_724_);
if (v___x_726_ == 0)
{
uint32_t v___x_727_; uint32_t v___x_728_; uint8_t v___x_729_; 
lean_dec(v_h__5_707_);
v___x_727_ = 123;
v___x_728_ = lean_unbox_uint32(v_head_710_);
v___x_729_ = lean_uint32_dec_eq(v___x_728_, v___x_727_);
if (v___x_729_ == 0)
{
lean_object* v___x_730_; 
lean_dec(v_tail_711_);
lean_dec(v_h__6_708_);
v___x_730_ = lean_apply_7(v_h__7_709_, v_input_702_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_730_;
}
else
{
lean_object* v___x_731_; 
lean_dec_ref_known(v_input_702_, 2);
lean_dec(v_h__7_709_);
v___x_731_ = lean_apply_1(v_h__6_708_, v_tail_711_);
return v___x_731_;
}
}
else
{
lean_object* v___x_732_; 
lean_dec_ref_known(v_input_702_, 2);
lean_dec(v_h__7_709_);
lean_dec(v_h__6_708_);
v___x_732_ = lean_apply_1(v_h__5_707_, v_tail_711_);
return v___x_732_;
}
}
else
{
lean_object* v___x_733_; 
lean_dec_ref_known(v_input_702_, 2);
lean_dec(v_h__7_709_);
lean_dec(v_h__6_708_);
lean_dec(v_h__5_707_);
v___x_733_ = lean_apply_1(v_h__4_706_, v_tail_711_);
return v___x_733_;
}
}
else
{
lean_object* v___x_735_; uint8_t v_isShared_736_; uint8_t v_isSharedCheck_864_; 
lean_dec(v_h__6_708_);
lean_dec(v_h__5_707_);
lean_dec(v_h__4_706_);
v_isSharedCheck_864_ = !lean_is_exclusive(v_input_702_);
if (v_isSharedCheck_864_ == 0)
{
lean_object* v_unused_865_; lean_object* v_unused_866_; 
v_unused_865_ = lean_ctor_get(v_input_702_, 1);
lean_dec(v_unused_865_);
v_unused_866_ = lean_ctor_get(v_input_702_, 0);
lean_dec(v_unused_866_);
v___x_735_ = v_input_702_;
v_isShared_736_ = v_isSharedCheck_864_;
goto v_resetjp_734_;
}
else
{
lean_dec(v_input_702_);
v___x_735_ = lean_box(0);
v_isShared_736_ = v_isSharedCheck_864_;
goto v_resetjp_734_;
}
v_resetjp_734_:
{
if (lean_obj_tag(v_tail_711_) == 1)
{
lean_object* v_head_737_; lean_object* v_tail_738_; uint32_t v___x_739_; uint32_t v___x_740_; uint8_t v___x_741_; 
v_head_737_ = lean_ctor_get(v_tail_711_, 0);
v_tail_738_ = lean_ctor_get(v_tail_711_, 1);
lean_inc(v_tail_738_);
v___x_739_ = 97;
v___x_740_ = lean_unbox_uint32(v_head_737_);
v___x_741_ = lean_uint32_dec_eq(v___x_740_, v___x_739_);
if (v___x_741_ == 0)
{
lean_object* v___x_742_; lean_object* v___x_744_; 
lean_dec(v_tail_738_);
lean_dec(v_h__3_705_);
v___x_742_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_736_ == 0)
{
lean_ctor_set(v___x_735_, 0, v___x_742_);
v___x_744_ = v___x_735_;
goto v_reusejp_743_;
}
else
{
lean_object* v_reuseFailAlloc_746_; 
v_reuseFailAlloc_746_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_746_, 0, v___x_742_);
lean_ctor_set(v_reuseFailAlloc_746_, 1, v_tail_711_);
v___x_744_ = v_reuseFailAlloc_746_;
goto v_reusejp_743_;
}
v_reusejp_743_:
{
lean_object* v___x_745_; 
v___x_745_ = lean_apply_7(v_h__7_709_, v___x_744_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_745_;
}
}
else
{
lean_object* v___x_748_; uint8_t v_isShared_749_; uint8_t v_isSharedCheck_856_; 
v_isSharedCheck_856_ = !lean_is_exclusive(v_tail_711_);
if (v_isSharedCheck_856_ == 0)
{
lean_object* v_unused_857_; lean_object* v_unused_858_; 
v_unused_857_ = lean_ctor_get(v_tail_711_, 1);
lean_dec(v_unused_857_);
v_unused_858_ = lean_ctor_get(v_tail_711_, 0);
lean_dec(v_unused_858_);
v___x_748_ = v_tail_711_;
v_isShared_749_ = v_isSharedCheck_856_;
goto v_resetjp_747_;
}
else
{
lean_dec(v_tail_711_);
v___x_748_ = lean_box(0);
v_isShared_749_ = v_isSharedCheck_856_;
goto v_resetjp_747_;
}
v_resetjp_747_:
{
if (lean_obj_tag(v_tail_738_) == 1)
{
lean_object* v_head_750_; lean_object* v_tail_751_; uint32_t v___x_752_; uint32_t v___x_753_; uint8_t v___x_754_; 
v_head_750_ = lean_ctor_get(v_tail_738_, 0);
v_tail_751_ = lean_ctor_get(v_tail_738_, 1);
lean_inc(v_tail_751_);
v___x_752_ = 108;
v___x_753_ = lean_unbox_uint32(v_head_750_);
v___x_754_ = lean_uint32_dec_eq(v___x_753_, v___x_752_);
if (v___x_754_ == 0)
{
lean_object* v___x_755_; lean_object* v___x_757_; 
lean_dec(v_tail_751_);
lean_dec(v_h__3_705_);
v___x_755_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
if (v_isShared_749_ == 0)
{
lean_ctor_set(v___x_748_, 0, v___x_755_);
v___x_757_ = v___x_748_;
goto v_reusejp_756_;
}
else
{
lean_object* v_reuseFailAlloc_763_; 
v_reuseFailAlloc_763_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_763_, 0, v___x_755_);
lean_ctor_set(v_reuseFailAlloc_763_, 1, v_tail_738_);
v___x_757_ = v_reuseFailAlloc_763_;
goto v_reusejp_756_;
}
v_reusejp_756_:
{
lean_object* v___x_758_; lean_object* v___x_760_; 
v___x_758_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_736_ == 0)
{
lean_ctor_set(v___x_735_, 1, v___x_757_);
lean_ctor_set(v___x_735_, 0, v___x_758_);
v___x_760_ = v___x_735_;
goto v_reusejp_759_;
}
else
{
lean_object* v_reuseFailAlloc_762_; 
v_reuseFailAlloc_762_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_762_, 0, v___x_758_);
lean_ctor_set(v_reuseFailAlloc_762_, 1, v___x_757_);
v___x_760_ = v_reuseFailAlloc_762_;
goto v_reusejp_759_;
}
v_reusejp_759_:
{
lean_object* v___x_761_; 
v___x_761_ = lean_apply_7(v_h__7_709_, v___x_760_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_761_;
}
}
}
else
{
lean_object* v___x_765_; uint8_t v_isShared_766_; uint8_t v_isSharedCheck_844_; 
v_isSharedCheck_844_ = !lean_is_exclusive(v_tail_738_);
if (v_isSharedCheck_844_ == 0)
{
lean_object* v_unused_845_; lean_object* v_unused_846_; 
v_unused_845_ = lean_ctor_get(v_tail_738_, 1);
lean_dec(v_unused_845_);
v_unused_846_ = lean_ctor_get(v_tail_738_, 0);
lean_dec(v_unused_846_);
v___x_765_ = v_tail_738_;
v_isShared_766_ = v_isSharedCheck_844_;
goto v_resetjp_764_;
}
else
{
lean_dec(v_tail_738_);
v___x_765_ = lean_box(0);
v_isShared_766_ = v_isSharedCheck_844_;
goto v_resetjp_764_;
}
v_resetjp_764_:
{
if (lean_obj_tag(v_tail_751_) == 1)
{
lean_object* v_head_767_; lean_object* v_tail_768_; uint32_t v___x_769_; uint32_t v___x_770_; uint8_t v___x_771_; 
v_head_767_ = lean_ctor_get(v_tail_751_, 0);
v_tail_768_ = lean_ctor_get(v_tail_751_, 1);
v___x_769_ = 115;
v___x_770_ = lean_unbox_uint32(v_head_767_);
v___x_771_ = lean_uint32_dec_eq(v___x_770_, v___x_769_);
if (v___x_771_ == 0)
{
lean_object* v___x_772_; lean_object* v___x_774_; 
lean_dec(v_h__3_705_);
v___x_772_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
if (v_isShared_766_ == 0)
{
lean_ctor_set(v___x_765_, 0, v___x_772_);
v___x_774_ = v___x_765_;
goto v_reusejp_773_;
}
else
{
lean_object* v_reuseFailAlloc_784_; 
v_reuseFailAlloc_784_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_784_, 0, v___x_772_);
lean_ctor_set(v_reuseFailAlloc_784_, 1, v_tail_751_);
v___x_774_ = v_reuseFailAlloc_784_;
goto v_reusejp_773_;
}
v_reusejp_773_:
{
lean_object* v___x_775_; lean_object* v___x_777_; 
v___x_775_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
if (v_isShared_749_ == 0)
{
lean_ctor_set(v___x_748_, 1, v___x_774_);
lean_ctor_set(v___x_748_, 0, v___x_775_);
v___x_777_ = v___x_748_;
goto v_reusejp_776_;
}
else
{
lean_object* v_reuseFailAlloc_783_; 
v_reuseFailAlloc_783_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_783_, 0, v___x_775_);
lean_ctor_set(v_reuseFailAlloc_783_, 1, v___x_774_);
v___x_777_ = v_reuseFailAlloc_783_;
goto v_reusejp_776_;
}
v_reusejp_776_:
{
lean_object* v___x_778_; lean_object* v___x_780_; 
v___x_778_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_736_ == 0)
{
lean_ctor_set(v___x_735_, 1, v___x_777_);
lean_ctor_set(v___x_735_, 0, v___x_778_);
v___x_780_ = v___x_735_;
goto v_reusejp_779_;
}
else
{
lean_object* v_reuseFailAlloc_782_; 
v_reuseFailAlloc_782_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_782_, 0, v___x_778_);
lean_ctor_set(v_reuseFailAlloc_782_, 1, v___x_777_);
v___x_780_ = v_reuseFailAlloc_782_;
goto v_reusejp_779_;
}
v_reusejp_779_:
{
lean_object* v___x_781_; 
v___x_781_ = lean_apply_7(v_h__7_709_, v___x_780_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_781_;
}
}
}
}
else
{
lean_object* v___x_786_; uint8_t v_isShared_787_; uint8_t v_isSharedCheck_828_; 
lean_inc(v_tail_768_);
v_isSharedCheck_828_ = !lean_is_exclusive(v_tail_751_);
if (v_isSharedCheck_828_ == 0)
{
lean_object* v_unused_829_; lean_object* v_unused_830_; 
v_unused_829_ = lean_ctor_get(v_tail_751_, 1);
lean_dec(v_unused_829_);
v_unused_830_ = lean_ctor_get(v_tail_751_, 0);
lean_dec(v_unused_830_);
v___x_786_ = v_tail_751_;
v_isShared_787_ = v_isSharedCheck_828_;
goto v_resetjp_785_;
}
else
{
lean_dec(v_tail_751_);
v___x_786_ = lean_box(0);
v_isShared_787_ = v_isSharedCheck_828_;
goto v_resetjp_785_;
}
v_resetjp_785_:
{
if (lean_obj_tag(v_tail_768_) == 1)
{
lean_object* v_head_788_; lean_object* v_tail_789_; uint32_t v___x_790_; uint32_t v___x_791_; uint8_t v___x_792_; 
v_head_788_ = lean_ctor_get(v_tail_768_, 0);
v_tail_789_ = lean_ctor_get(v_tail_768_, 1);
v___x_790_ = 101;
v___x_791_ = lean_unbox_uint32(v_head_788_);
v___x_792_ = lean_uint32_dec_eq(v___x_791_, v___x_790_);
if (v___x_792_ == 0)
{
lean_object* v___x_793_; lean_object* v___x_795_; 
lean_dec(v_h__3_705_);
v___x_793_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__5___boxed__const__1;
if (v_isShared_787_ == 0)
{
lean_ctor_set(v___x_786_, 0, v___x_793_);
v___x_795_ = v___x_786_;
goto v_reusejp_794_;
}
else
{
lean_object* v_reuseFailAlloc_809_; 
v_reuseFailAlloc_809_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_809_, 0, v___x_793_);
lean_ctor_set(v_reuseFailAlloc_809_, 1, v_tail_768_);
v___x_795_ = v_reuseFailAlloc_809_;
goto v_reusejp_794_;
}
v_reusejp_794_:
{
lean_object* v___x_796_; lean_object* v___x_798_; 
v___x_796_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
if (v_isShared_766_ == 0)
{
lean_ctor_set(v___x_765_, 1, v___x_795_);
lean_ctor_set(v___x_765_, 0, v___x_796_);
v___x_798_ = v___x_765_;
goto v_reusejp_797_;
}
else
{
lean_object* v_reuseFailAlloc_808_; 
v_reuseFailAlloc_808_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_808_, 0, v___x_796_);
lean_ctor_set(v_reuseFailAlloc_808_, 1, v___x_795_);
v___x_798_ = v_reuseFailAlloc_808_;
goto v_reusejp_797_;
}
v_reusejp_797_:
{
lean_object* v___x_799_; lean_object* v___x_801_; 
v___x_799_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
if (v_isShared_749_ == 0)
{
lean_ctor_set(v___x_748_, 1, v___x_798_);
lean_ctor_set(v___x_748_, 0, v___x_799_);
v___x_801_ = v___x_748_;
goto v_reusejp_800_;
}
else
{
lean_object* v_reuseFailAlloc_807_; 
v_reuseFailAlloc_807_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_807_, 0, v___x_799_);
lean_ctor_set(v_reuseFailAlloc_807_, 1, v___x_798_);
v___x_801_ = v_reuseFailAlloc_807_;
goto v_reusejp_800_;
}
v_reusejp_800_:
{
lean_object* v___x_802_; lean_object* v___x_804_; 
v___x_802_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_736_ == 0)
{
lean_ctor_set(v___x_735_, 1, v___x_801_);
lean_ctor_set(v___x_735_, 0, v___x_802_);
v___x_804_ = v___x_735_;
goto v_reusejp_803_;
}
else
{
lean_object* v_reuseFailAlloc_806_; 
v_reuseFailAlloc_806_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_806_, 0, v___x_802_);
lean_ctor_set(v_reuseFailAlloc_806_, 1, v___x_801_);
v___x_804_ = v_reuseFailAlloc_806_;
goto v_reusejp_803_;
}
v_reusejp_803_:
{
lean_object* v___x_805_; 
v___x_805_ = lean_apply_7(v_h__7_709_, v___x_804_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_805_;
}
}
}
}
}
else
{
lean_object* v___x_810_; 
lean_inc(v_tail_789_);
lean_dec_ref_known(v_tail_768_, 2);
lean_del_object(v___x_786_);
lean_del_object(v___x_765_);
lean_del_object(v___x_748_);
lean_del_object(v___x_735_);
lean_dec(v_h__7_709_);
v___x_810_ = lean_apply_1(v_h__3_705_, v_tail_789_);
return v___x_810_;
}
}
else
{
lean_object* v___x_811_; lean_object* v___x_813_; 
lean_dec(v_h__3_705_);
v___x_811_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__5___boxed__const__1;
if (v_isShared_787_ == 0)
{
lean_ctor_set(v___x_786_, 0, v___x_811_);
v___x_813_ = v___x_786_;
goto v_reusejp_812_;
}
else
{
lean_object* v_reuseFailAlloc_827_; 
v_reuseFailAlloc_827_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_827_, 0, v___x_811_);
lean_ctor_set(v_reuseFailAlloc_827_, 1, v_tail_768_);
v___x_813_ = v_reuseFailAlloc_827_;
goto v_reusejp_812_;
}
v_reusejp_812_:
{
lean_object* v___x_814_; lean_object* v___x_816_; 
v___x_814_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
if (v_isShared_766_ == 0)
{
lean_ctor_set(v___x_765_, 1, v___x_813_);
lean_ctor_set(v___x_765_, 0, v___x_814_);
v___x_816_ = v___x_765_;
goto v_reusejp_815_;
}
else
{
lean_object* v_reuseFailAlloc_826_; 
v_reuseFailAlloc_826_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_826_, 0, v___x_814_);
lean_ctor_set(v_reuseFailAlloc_826_, 1, v___x_813_);
v___x_816_ = v_reuseFailAlloc_826_;
goto v_reusejp_815_;
}
v_reusejp_815_:
{
lean_object* v___x_817_; lean_object* v___x_819_; 
v___x_817_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
if (v_isShared_749_ == 0)
{
lean_ctor_set(v___x_748_, 1, v___x_816_);
lean_ctor_set(v___x_748_, 0, v___x_817_);
v___x_819_ = v___x_748_;
goto v_reusejp_818_;
}
else
{
lean_object* v_reuseFailAlloc_825_; 
v_reuseFailAlloc_825_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_825_, 0, v___x_817_);
lean_ctor_set(v_reuseFailAlloc_825_, 1, v___x_816_);
v___x_819_ = v_reuseFailAlloc_825_;
goto v_reusejp_818_;
}
v_reusejp_818_:
{
lean_object* v___x_820_; lean_object* v___x_822_; 
v___x_820_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_736_ == 0)
{
lean_ctor_set(v___x_735_, 1, v___x_819_);
lean_ctor_set(v___x_735_, 0, v___x_820_);
v___x_822_ = v___x_735_;
goto v_reusejp_821_;
}
else
{
lean_object* v_reuseFailAlloc_824_; 
v_reuseFailAlloc_824_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_824_, 0, v___x_820_);
lean_ctor_set(v_reuseFailAlloc_824_, 1, v___x_819_);
v___x_822_ = v_reuseFailAlloc_824_;
goto v_reusejp_821_;
}
v_reusejp_821_:
{
lean_object* v___x_823_; 
v___x_823_ = lean_apply_7(v_h__7_709_, v___x_822_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_823_;
}
}
}
}
}
}
}
}
else
{
lean_object* v___x_831_; lean_object* v___x_833_; 
lean_dec(v_h__3_705_);
v___x_831_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
if (v_isShared_766_ == 0)
{
lean_ctor_set(v___x_765_, 0, v___x_831_);
v___x_833_ = v___x_765_;
goto v_reusejp_832_;
}
else
{
lean_object* v_reuseFailAlloc_843_; 
v_reuseFailAlloc_843_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_843_, 0, v___x_831_);
lean_ctor_set(v_reuseFailAlloc_843_, 1, v_tail_751_);
v___x_833_ = v_reuseFailAlloc_843_;
goto v_reusejp_832_;
}
v_reusejp_832_:
{
lean_object* v___x_834_; lean_object* v___x_836_; 
v___x_834_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
if (v_isShared_749_ == 0)
{
lean_ctor_set(v___x_748_, 1, v___x_833_);
lean_ctor_set(v___x_748_, 0, v___x_834_);
v___x_836_ = v___x_748_;
goto v_reusejp_835_;
}
else
{
lean_object* v_reuseFailAlloc_842_; 
v_reuseFailAlloc_842_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_842_, 0, v___x_834_);
lean_ctor_set(v_reuseFailAlloc_842_, 1, v___x_833_);
v___x_836_ = v_reuseFailAlloc_842_;
goto v_reusejp_835_;
}
v_reusejp_835_:
{
lean_object* v___x_837_; lean_object* v___x_839_; 
v___x_837_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_736_ == 0)
{
lean_ctor_set(v___x_735_, 1, v___x_836_);
lean_ctor_set(v___x_735_, 0, v___x_837_);
v___x_839_ = v___x_735_;
goto v_reusejp_838_;
}
else
{
lean_object* v_reuseFailAlloc_841_; 
v_reuseFailAlloc_841_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_841_, 0, v___x_837_);
lean_ctor_set(v_reuseFailAlloc_841_, 1, v___x_836_);
v___x_839_ = v_reuseFailAlloc_841_;
goto v_reusejp_838_;
}
v_reusejp_838_:
{
lean_object* v___x_840_; 
v___x_840_ = lean_apply_7(v_h__7_709_, v___x_839_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_840_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_847_; lean_object* v___x_849_; 
lean_dec(v_h__3_705_);
v___x_847_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
if (v_isShared_749_ == 0)
{
lean_ctor_set(v___x_748_, 0, v___x_847_);
v___x_849_ = v___x_748_;
goto v_reusejp_848_;
}
else
{
lean_object* v_reuseFailAlloc_855_; 
v_reuseFailAlloc_855_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_855_, 0, v___x_847_);
lean_ctor_set(v_reuseFailAlloc_855_, 1, v_tail_738_);
v___x_849_ = v_reuseFailAlloc_855_;
goto v_reusejp_848_;
}
v_reusejp_848_:
{
lean_object* v___x_850_; lean_object* v___x_852_; 
v___x_850_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_736_ == 0)
{
lean_ctor_set(v___x_735_, 1, v___x_849_);
lean_ctor_set(v___x_735_, 0, v___x_850_);
v___x_852_ = v___x_735_;
goto v_reusejp_851_;
}
else
{
lean_object* v_reuseFailAlloc_854_; 
v_reuseFailAlloc_854_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_854_, 0, v___x_850_);
lean_ctor_set(v_reuseFailAlloc_854_, 1, v___x_849_);
v___x_852_ = v_reuseFailAlloc_854_;
goto v_reusejp_851_;
}
v_reusejp_851_:
{
lean_object* v___x_853_; 
v___x_853_ = lean_apply_7(v_h__7_709_, v___x_852_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_853_;
}
}
}
}
}
}
else
{
lean_object* v___x_859_; lean_object* v___x_861_; 
lean_dec(v_h__3_705_);
v___x_859_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_736_ == 0)
{
lean_ctor_set(v___x_735_, 0, v___x_859_);
v___x_861_ = v___x_735_;
goto v_reusejp_860_;
}
else
{
lean_object* v_reuseFailAlloc_863_; 
v_reuseFailAlloc_863_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_863_, 0, v___x_859_);
lean_ctor_set(v_reuseFailAlloc_863_, 1, v_tail_711_);
v___x_861_ = v_reuseFailAlloc_863_;
goto v_reusejp_860_;
}
v_reusejp_860_:
{
lean_object* v___x_862_; 
v___x_862_ = lean_apply_7(v_h__7_709_, v___x_861_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_862_;
}
}
}
}
}
else
{
lean_object* v___x_868_; uint8_t v_isShared_869_; uint8_t v_isSharedCheck_952_; 
lean_dec(v_h__6_708_);
lean_dec(v_h__5_707_);
lean_dec(v_h__4_706_);
lean_dec(v_h__3_705_);
v_isSharedCheck_952_ = !lean_is_exclusive(v_input_702_);
if (v_isSharedCheck_952_ == 0)
{
lean_object* v_unused_953_; lean_object* v_unused_954_; 
v_unused_953_ = lean_ctor_get(v_input_702_, 1);
lean_dec(v_unused_953_);
v_unused_954_ = lean_ctor_get(v_input_702_, 0);
lean_dec(v_unused_954_);
v___x_868_ = v_input_702_;
v_isShared_869_ = v_isSharedCheck_952_;
goto v_resetjp_867_;
}
else
{
lean_dec(v_input_702_);
v___x_868_ = lean_box(0);
v_isShared_869_ = v_isSharedCheck_952_;
goto v_resetjp_867_;
}
v_resetjp_867_:
{
if (lean_obj_tag(v_tail_711_) == 1)
{
lean_object* v_head_870_; lean_object* v_tail_871_; uint32_t v___x_872_; uint32_t v___x_873_; uint8_t v___x_874_; 
v_head_870_ = lean_ctor_get(v_tail_711_, 0);
v_tail_871_ = lean_ctor_get(v_tail_711_, 1);
lean_inc(v_tail_871_);
v___x_872_ = 114;
v___x_873_ = lean_unbox_uint32(v_head_870_);
v___x_874_ = lean_uint32_dec_eq(v___x_873_, v___x_872_);
if (v___x_874_ == 0)
{
lean_object* v___x_875_; lean_object* v___x_877_; 
lean_dec(v_tail_871_);
lean_dec(v_h__2_704_);
v___x_875_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
if (v_isShared_869_ == 0)
{
lean_ctor_set(v___x_868_, 0, v___x_875_);
v___x_877_ = v___x_868_;
goto v_reusejp_876_;
}
else
{
lean_object* v_reuseFailAlloc_879_; 
v_reuseFailAlloc_879_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_879_, 0, v___x_875_);
lean_ctor_set(v_reuseFailAlloc_879_, 1, v_tail_711_);
v___x_877_ = v_reuseFailAlloc_879_;
goto v_reusejp_876_;
}
v_reusejp_876_:
{
lean_object* v___x_878_; 
v___x_878_ = lean_apply_7(v_h__7_709_, v___x_877_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_878_;
}
}
else
{
lean_object* v___x_881_; uint8_t v_isShared_882_; uint8_t v_isSharedCheck_944_; 
v_isSharedCheck_944_ = !lean_is_exclusive(v_tail_711_);
if (v_isSharedCheck_944_ == 0)
{
lean_object* v_unused_945_; lean_object* v_unused_946_; 
v_unused_945_ = lean_ctor_get(v_tail_711_, 1);
lean_dec(v_unused_945_);
v_unused_946_ = lean_ctor_get(v_tail_711_, 0);
lean_dec(v_unused_946_);
v___x_881_ = v_tail_711_;
v_isShared_882_ = v_isSharedCheck_944_;
goto v_resetjp_880_;
}
else
{
lean_dec(v_tail_711_);
v___x_881_ = lean_box(0);
v_isShared_882_ = v_isSharedCheck_944_;
goto v_resetjp_880_;
}
v_resetjp_880_:
{
if (lean_obj_tag(v_tail_871_) == 1)
{
lean_object* v_head_883_; lean_object* v_tail_884_; uint32_t v___x_885_; uint32_t v___x_886_; uint8_t v___x_887_; 
v_head_883_ = lean_ctor_get(v_tail_871_, 0);
v_tail_884_ = lean_ctor_get(v_tail_871_, 1);
v___x_885_ = 117;
v___x_886_ = lean_unbox_uint32(v_head_883_);
v___x_887_ = lean_uint32_dec_eq(v___x_886_, v___x_885_);
if (v___x_887_ == 0)
{
lean_object* v___x_888_; lean_object* v___x_890_; 
lean_dec(v_h__2_704_);
v___x_888_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1;
if (v_isShared_882_ == 0)
{
lean_ctor_set(v___x_881_, 0, v___x_888_);
v___x_890_ = v___x_881_;
goto v_reusejp_889_;
}
else
{
lean_object* v_reuseFailAlloc_896_; 
v_reuseFailAlloc_896_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_896_, 0, v___x_888_);
lean_ctor_set(v_reuseFailAlloc_896_, 1, v_tail_871_);
v___x_890_ = v_reuseFailAlloc_896_;
goto v_reusejp_889_;
}
v_reusejp_889_:
{
lean_object* v___x_891_; lean_object* v___x_893_; 
v___x_891_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
if (v_isShared_869_ == 0)
{
lean_ctor_set(v___x_868_, 1, v___x_890_);
lean_ctor_set(v___x_868_, 0, v___x_891_);
v___x_893_ = v___x_868_;
goto v_reusejp_892_;
}
else
{
lean_object* v_reuseFailAlloc_895_; 
v_reuseFailAlloc_895_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_895_, 0, v___x_891_);
lean_ctor_set(v_reuseFailAlloc_895_, 1, v___x_890_);
v___x_893_ = v_reuseFailAlloc_895_;
goto v_reusejp_892_;
}
v_reusejp_892_:
{
lean_object* v___x_894_; 
v___x_894_ = lean_apply_7(v_h__7_709_, v___x_893_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_894_;
}
}
}
else
{
lean_object* v___x_898_; uint8_t v_isShared_899_; uint8_t v_isSharedCheck_932_; 
lean_inc(v_tail_884_);
v_isSharedCheck_932_ = !lean_is_exclusive(v_tail_871_);
if (v_isSharedCheck_932_ == 0)
{
lean_object* v_unused_933_; lean_object* v_unused_934_; 
v_unused_933_ = lean_ctor_get(v_tail_871_, 1);
lean_dec(v_unused_933_);
v_unused_934_ = lean_ctor_get(v_tail_871_, 0);
lean_dec(v_unused_934_);
v___x_898_ = v_tail_871_;
v_isShared_899_ = v_isSharedCheck_932_;
goto v_resetjp_897_;
}
else
{
lean_dec(v_tail_871_);
v___x_898_ = lean_box(0);
v_isShared_899_ = v_isSharedCheck_932_;
goto v_resetjp_897_;
}
v_resetjp_897_:
{
if (lean_obj_tag(v_tail_884_) == 1)
{
lean_object* v_head_900_; lean_object* v_tail_901_; uint32_t v___x_902_; uint32_t v___x_903_; uint8_t v___x_904_; 
v_head_900_ = lean_ctor_get(v_tail_884_, 0);
v_tail_901_ = lean_ctor_get(v_tail_884_, 1);
v___x_902_ = 101;
v___x_903_ = lean_unbox_uint32(v_head_900_);
v___x_904_ = lean_uint32_dec_eq(v___x_903_, v___x_902_);
if (v___x_904_ == 0)
{
lean_object* v___x_905_; lean_object* v___x_907_; 
lean_dec(v_h__2_704_);
v___x_905_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
if (v_isShared_899_ == 0)
{
lean_ctor_set(v___x_898_, 0, v___x_905_);
v___x_907_ = v___x_898_;
goto v_reusejp_906_;
}
else
{
lean_object* v_reuseFailAlloc_917_; 
v_reuseFailAlloc_917_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_917_, 0, v___x_905_);
lean_ctor_set(v_reuseFailAlloc_917_, 1, v_tail_884_);
v___x_907_ = v_reuseFailAlloc_917_;
goto v_reusejp_906_;
}
v_reusejp_906_:
{
lean_object* v___x_908_; lean_object* v___x_910_; 
v___x_908_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1;
if (v_isShared_882_ == 0)
{
lean_ctor_set(v___x_881_, 1, v___x_907_);
lean_ctor_set(v___x_881_, 0, v___x_908_);
v___x_910_ = v___x_881_;
goto v_reusejp_909_;
}
else
{
lean_object* v_reuseFailAlloc_916_; 
v_reuseFailAlloc_916_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_916_, 0, v___x_908_);
lean_ctor_set(v_reuseFailAlloc_916_, 1, v___x_907_);
v___x_910_ = v_reuseFailAlloc_916_;
goto v_reusejp_909_;
}
v_reusejp_909_:
{
lean_object* v___x_911_; lean_object* v___x_913_; 
v___x_911_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
if (v_isShared_869_ == 0)
{
lean_ctor_set(v___x_868_, 1, v___x_910_);
lean_ctor_set(v___x_868_, 0, v___x_911_);
v___x_913_ = v___x_868_;
goto v_reusejp_912_;
}
else
{
lean_object* v_reuseFailAlloc_915_; 
v_reuseFailAlloc_915_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_915_, 0, v___x_911_);
lean_ctor_set(v_reuseFailAlloc_915_, 1, v___x_910_);
v___x_913_ = v_reuseFailAlloc_915_;
goto v_reusejp_912_;
}
v_reusejp_912_:
{
lean_object* v___x_914_; 
v___x_914_ = lean_apply_7(v_h__7_709_, v___x_913_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_914_;
}
}
}
}
else
{
lean_object* v___x_918_; 
lean_inc(v_tail_901_);
lean_dec_ref_known(v_tail_884_, 2);
lean_del_object(v___x_898_);
lean_del_object(v___x_881_);
lean_del_object(v___x_868_);
lean_dec(v_h__7_709_);
v___x_918_ = lean_apply_1(v_h__2_704_, v_tail_901_);
return v___x_918_;
}
}
else
{
lean_object* v___x_919_; lean_object* v___x_921_; 
lean_dec(v_h__2_704_);
v___x_919_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
if (v_isShared_899_ == 0)
{
lean_ctor_set(v___x_898_, 0, v___x_919_);
v___x_921_ = v___x_898_;
goto v_reusejp_920_;
}
else
{
lean_object* v_reuseFailAlloc_931_; 
v_reuseFailAlloc_931_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_931_, 0, v___x_919_);
lean_ctor_set(v_reuseFailAlloc_931_, 1, v_tail_884_);
v___x_921_ = v_reuseFailAlloc_931_;
goto v_reusejp_920_;
}
v_reusejp_920_:
{
lean_object* v___x_922_; lean_object* v___x_924_; 
v___x_922_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1;
if (v_isShared_882_ == 0)
{
lean_ctor_set(v___x_881_, 1, v___x_921_);
lean_ctor_set(v___x_881_, 0, v___x_922_);
v___x_924_ = v___x_881_;
goto v_reusejp_923_;
}
else
{
lean_object* v_reuseFailAlloc_930_; 
v_reuseFailAlloc_930_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_930_, 0, v___x_922_);
lean_ctor_set(v_reuseFailAlloc_930_, 1, v___x_921_);
v___x_924_ = v_reuseFailAlloc_930_;
goto v_reusejp_923_;
}
v_reusejp_923_:
{
lean_object* v___x_925_; lean_object* v___x_927_; 
v___x_925_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
if (v_isShared_869_ == 0)
{
lean_ctor_set(v___x_868_, 1, v___x_924_);
lean_ctor_set(v___x_868_, 0, v___x_925_);
v___x_927_ = v___x_868_;
goto v_reusejp_926_;
}
else
{
lean_object* v_reuseFailAlloc_929_; 
v_reuseFailAlloc_929_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_929_, 0, v___x_925_);
lean_ctor_set(v_reuseFailAlloc_929_, 1, v___x_924_);
v___x_927_ = v_reuseFailAlloc_929_;
goto v_reusejp_926_;
}
v_reusejp_926_:
{
lean_object* v___x_928_; 
v___x_928_ = lean_apply_7(v_h__7_709_, v___x_927_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_928_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_935_; lean_object* v___x_937_; 
lean_dec(v_h__2_704_);
v___x_935_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1;
if (v_isShared_882_ == 0)
{
lean_ctor_set(v___x_881_, 0, v___x_935_);
v___x_937_ = v___x_881_;
goto v_reusejp_936_;
}
else
{
lean_object* v_reuseFailAlloc_943_; 
v_reuseFailAlloc_943_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_943_, 0, v___x_935_);
lean_ctor_set(v_reuseFailAlloc_943_, 1, v_tail_871_);
v___x_937_ = v_reuseFailAlloc_943_;
goto v_reusejp_936_;
}
v_reusejp_936_:
{
lean_object* v___x_938_; lean_object* v___x_940_; 
v___x_938_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
if (v_isShared_869_ == 0)
{
lean_ctor_set(v___x_868_, 1, v___x_937_);
lean_ctor_set(v___x_868_, 0, v___x_938_);
v___x_940_ = v___x_868_;
goto v_reusejp_939_;
}
else
{
lean_object* v_reuseFailAlloc_942_; 
v_reuseFailAlloc_942_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_942_, 0, v___x_938_);
lean_ctor_set(v_reuseFailAlloc_942_, 1, v___x_937_);
v___x_940_ = v_reuseFailAlloc_942_;
goto v_reusejp_939_;
}
v_reusejp_939_:
{
lean_object* v___x_941_; 
v___x_941_ = lean_apply_7(v_h__7_709_, v___x_940_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_941_;
}
}
}
}
}
}
else
{
lean_object* v___x_947_; lean_object* v___x_949_; 
lean_dec(v_h__2_704_);
v___x_947_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
if (v_isShared_869_ == 0)
{
lean_ctor_set(v___x_868_, 0, v___x_947_);
v___x_949_ = v___x_868_;
goto v_reusejp_948_;
}
else
{
lean_object* v_reuseFailAlloc_951_; 
v_reuseFailAlloc_951_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_951_, 0, v___x_947_);
lean_ctor_set(v_reuseFailAlloc_951_, 1, v_tail_711_);
v___x_949_ = v_reuseFailAlloc_951_;
goto v_reusejp_948_;
}
v_reusejp_948_:
{
lean_object* v___x_950_; 
v___x_950_ = lean_apply_7(v_h__7_709_, v___x_949_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_950_;
}
}
}
}
}
else
{
lean_object* v___x_956_; uint8_t v_isShared_957_; uint8_t v_isSharedCheck_1039_; 
lean_dec(v_h__6_708_);
lean_dec(v_h__5_707_);
lean_dec(v_h__4_706_);
lean_dec(v_h__3_705_);
lean_dec(v_h__2_704_);
v_isSharedCheck_1039_ = !lean_is_exclusive(v_input_702_);
if (v_isSharedCheck_1039_ == 0)
{
lean_object* v_unused_1040_; lean_object* v_unused_1041_; 
v_unused_1040_ = lean_ctor_get(v_input_702_, 1);
lean_dec(v_unused_1040_);
v_unused_1041_ = lean_ctor_get(v_input_702_, 0);
lean_dec(v_unused_1041_);
v___x_956_ = v_input_702_;
v_isShared_957_ = v_isSharedCheck_1039_;
goto v_resetjp_955_;
}
else
{
lean_dec(v_input_702_);
v___x_956_ = lean_box(0);
v_isShared_957_ = v_isSharedCheck_1039_;
goto v_resetjp_955_;
}
v_resetjp_955_:
{
if (lean_obj_tag(v_tail_711_) == 1)
{
lean_object* v_head_958_; lean_object* v_tail_959_; uint32_t v___x_960_; uint32_t v___x_961_; uint8_t v___x_962_; 
v_head_958_ = lean_ctor_get(v_tail_711_, 0);
v_tail_959_ = lean_ctor_get(v_tail_711_, 1);
lean_inc(v_tail_959_);
v___x_960_ = 117;
v___x_961_ = lean_unbox_uint32(v_head_958_);
v___x_962_ = lean_uint32_dec_eq(v___x_961_, v___x_960_);
if (v___x_962_ == 0)
{
lean_object* v___x_963_; lean_object* v___x_965_; 
lean_dec(v_tail_959_);
lean_dec(v_h__1_703_);
v___x_963_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
if (v_isShared_957_ == 0)
{
lean_ctor_set(v___x_956_, 0, v___x_963_);
v___x_965_ = v___x_956_;
goto v_reusejp_964_;
}
else
{
lean_object* v_reuseFailAlloc_967_; 
v_reuseFailAlloc_967_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_967_, 0, v___x_963_);
lean_ctor_set(v_reuseFailAlloc_967_, 1, v_tail_711_);
v___x_965_ = v_reuseFailAlloc_967_;
goto v_reusejp_964_;
}
v_reusejp_964_:
{
lean_object* v___x_966_; 
v___x_966_ = lean_apply_7(v_h__7_709_, v___x_965_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_966_;
}
}
else
{
lean_object* v___x_969_; uint8_t v_isShared_970_; uint8_t v_isSharedCheck_1031_; 
v_isSharedCheck_1031_ = !lean_is_exclusive(v_tail_711_);
if (v_isSharedCheck_1031_ == 0)
{
lean_object* v_unused_1032_; lean_object* v_unused_1033_; 
v_unused_1032_ = lean_ctor_get(v_tail_711_, 1);
lean_dec(v_unused_1032_);
v_unused_1033_ = lean_ctor_get(v_tail_711_, 0);
lean_dec(v_unused_1033_);
v___x_969_ = v_tail_711_;
v_isShared_970_ = v_isSharedCheck_1031_;
goto v_resetjp_968_;
}
else
{
lean_dec(v_tail_711_);
v___x_969_ = lean_box(0);
v_isShared_970_ = v_isSharedCheck_1031_;
goto v_resetjp_968_;
}
v_resetjp_968_:
{
if (lean_obj_tag(v_tail_959_) == 1)
{
lean_object* v_head_971_; lean_object* v_tail_972_; uint32_t v___x_973_; uint32_t v___x_974_; uint8_t v___x_975_; 
v_head_971_ = lean_ctor_get(v_tail_959_, 0);
v_tail_972_ = lean_ctor_get(v_tail_959_, 1);
v___x_973_ = 108;
v___x_974_ = lean_unbox_uint32(v_head_971_);
v___x_975_ = lean_uint32_dec_eq(v___x_974_, v___x_973_);
if (v___x_975_ == 0)
{
lean_object* v___x_976_; lean_object* v___x_978_; 
lean_dec(v_h__1_703_);
v___x_976_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
if (v_isShared_970_ == 0)
{
lean_ctor_set(v___x_969_, 0, v___x_976_);
v___x_978_ = v___x_969_;
goto v_reusejp_977_;
}
else
{
lean_object* v_reuseFailAlloc_984_; 
v_reuseFailAlloc_984_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_984_, 0, v___x_976_);
lean_ctor_set(v_reuseFailAlloc_984_, 1, v_tail_959_);
v___x_978_ = v_reuseFailAlloc_984_;
goto v_reusejp_977_;
}
v_reusejp_977_:
{
lean_object* v___x_979_; lean_object* v___x_981_; 
v___x_979_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
if (v_isShared_957_ == 0)
{
lean_ctor_set(v___x_956_, 1, v___x_978_);
lean_ctor_set(v___x_956_, 0, v___x_979_);
v___x_981_ = v___x_956_;
goto v_reusejp_980_;
}
else
{
lean_object* v_reuseFailAlloc_983_; 
v_reuseFailAlloc_983_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_983_, 0, v___x_979_);
lean_ctor_set(v_reuseFailAlloc_983_, 1, v___x_978_);
v___x_981_ = v_reuseFailAlloc_983_;
goto v_reusejp_980_;
}
v_reusejp_980_:
{
lean_object* v___x_982_; 
v___x_982_ = lean_apply_7(v_h__7_709_, v___x_981_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_982_;
}
}
}
else
{
lean_object* v___x_986_; uint8_t v_isShared_987_; uint8_t v_isSharedCheck_1019_; 
lean_inc(v_tail_972_);
v_isSharedCheck_1019_ = !lean_is_exclusive(v_tail_959_);
if (v_isSharedCheck_1019_ == 0)
{
lean_object* v_unused_1020_; lean_object* v_unused_1021_; 
v_unused_1020_ = lean_ctor_get(v_tail_959_, 1);
lean_dec(v_unused_1020_);
v_unused_1021_ = lean_ctor_get(v_tail_959_, 0);
lean_dec(v_unused_1021_);
v___x_986_ = v_tail_959_;
v_isShared_987_ = v_isSharedCheck_1019_;
goto v_resetjp_985_;
}
else
{
lean_dec(v_tail_959_);
v___x_986_ = lean_box(0);
v_isShared_987_ = v_isSharedCheck_1019_;
goto v_resetjp_985_;
}
v_resetjp_985_:
{
if (lean_obj_tag(v_tail_972_) == 1)
{
lean_object* v_head_988_; lean_object* v_tail_989_; uint32_t v___x_990_; uint8_t v___x_991_; 
v_head_988_ = lean_ctor_get(v_tail_972_, 0);
v_tail_989_ = lean_ctor_get(v_tail_972_, 1);
v___x_990_ = lean_unbox_uint32(v_head_988_);
v___x_991_ = lean_uint32_dec_eq(v___x_990_, v___x_973_);
if (v___x_991_ == 0)
{
lean_object* v___x_992_; lean_object* v___x_994_; 
lean_dec(v_h__1_703_);
v___x_992_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
if (v_isShared_987_ == 0)
{
lean_ctor_set(v___x_986_, 0, v___x_992_);
v___x_994_ = v___x_986_;
goto v_reusejp_993_;
}
else
{
lean_object* v_reuseFailAlloc_1004_; 
v_reuseFailAlloc_1004_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1004_, 0, v___x_992_);
lean_ctor_set(v_reuseFailAlloc_1004_, 1, v_tail_972_);
v___x_994_ = v_reuseFailAlloc_1004_;
goto v_reusejp_993_;
}
v_reusejp_993_:
{
lean_object* v___x_995_; lean_object* v___x_997_; 
v___x_995_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
if (v_isShared_970_ == 0)
{
lean_ctor_set(v___x_969_, 1, v___x_994_);
lean_ctor_set(v___x_969_, 0, v___x_995_);
v___x_997_ = v___x_969_;
goto v_reusejp_996_;
}
else
{
lean_object* v_reuseFailAlloc_1003_; 
v_reuseFailAlloc_1003_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1003_, 0, v___x_995_);
lean_ctor_set(v_reuseFailAlloc_1003_, 1, v___x_994_);
v___x_997_ = v_reuseFailAlloc_1003_;
goto v_reusejp_996_;
}
v_reusejp_996_:
{
lean_object* v___x_998_; lean_object* v___x_1000_; 
v___x_998_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
if (v_isShared_957_ == 0)
{
lean_ctor_set(v___x_956_, 1, v___x_997_);
lean_ctor_set(v___x_956_, 0, v___x_998_);
v___x_1000_ = v___x_956_;
goto v_reusejp_999_;
}
else
{
lean_object* v_reuseFailAlloc_1002_; 
v_reuseFailAlloc_1002_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1002_, 0, v___x_998_);
lean_ctor_set(v_reuseFailAlloc_1002_, 1, v___x_997_);
v___x_1000_ = v_reuseFailAlloc_1002_;
goto v_reusejp_999_;
}
v_reusejp_999_:
{
lean_object* v___x_1001_; 
v___x_1001_ = lean_apply_7(v_h__7_709_, v___x_1000_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1001_;
}
}
}
}
else
{
lean_object* v___x_1005_; 
lean_inc(v_tail_989_);
lean_dec_ref_known(v_tail_972_, 2);
lean_del_object(v___x_986_);
lean_del_object(v___x_969_);
lean_del_object(v___x_956_);
lean_dec(v_h__7_709_);
v___x_1005_ = lean_apply_1(v_h__1_703_, v_tail_989_);
return v___x_1005_;
}
}
else
{
lean_object* v___x_1006_; lean_object* v___x_1008_; 
lean_dec(v_h__1_703_);
v___x_1006_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
if (v_isShared_987_ == 0)
{
lean_ctor_set(v___x_986_, 0, v___x_1006_);
v___x_1008_ = v___x_986_;
goto v_reusejp_1007_;
}
else
{
lean_object* v_reuseFailAlloc_1018_; 
v_reuseFailAlloc_1018_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1018_, 0, v___x_1006_);
lean_ctor_set(v_reuseFailAlloc_1018_, 1, v_tail_972_);
v___x_1008_ = v_reuseFailAlloc_1018_;
goto v_reusejp_1007_;
}
v_reusejp_1007_:
{
lean_object* v___x_1009_; lean_object* v___x_1011_; 
v___x_1009_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
if (v_isShared_970_ == 0)
{
lean_ctor_set(v___x_969_, 1, v___x_1008_);
lean_ctor_set(v___x_969_, 0, v___x_1009_);
v___x_1011_ = v___x_969_;
goto v_reusejp_1010_;
}
else
{
lean_object* v_reuseFailAlloc_1017_; 
v_reuseFailAlloc_1017_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1017_, 0, v___x_1009_);
lean_ctor_set(v_reuseFailAlloc_1017_, 1, v___x_1008_);
v___x_1011_ = v_reuseFailAlloc_1017_;
goto v_reusejp_1010_;
}
v_reusejp_1010_:
{
lean_object* v___x_1012_; lean_object* v___x_1014_; 
v___x_1012_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
if (v_isShared_957_ == 0)
{
lean_ctor_set(v___x_956_, 1, v___x_1011_);
lean_ctor_set(v___x_956_, 0, v___x_1012_);
v___x_1014_ = v___x_956_;
goto v_reusejp_1013_;
}
else
{
lean_object* v_reuseFailAlloc_1016_; 
v_reuseFailAlloc_1016_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1016_, 0, v___x_1012_);
lean_ctor_set(v_reuseFailAlloc_1016_, 1, v___x_1011_);
v___x_1014_ = v_reuseFailAlloc_1016_;
goto v_reusejp_1013_;
}
v_reusejp_1013_:
{
lean_object* v___x_1015_; 
v___x_1015_ = lean_apply_7(v_h__7_709_, v___x_1014_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1015_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_1022_; lean_object* v___x_1024_; 
lean_dec(v_h__1_703_);
v___x_1022_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
if (v_isShared_970_ == 0)
{
lean_ctor_set(v___x_969_, 0, v___x_1022_);
v___x_1024_ = v___x_969_;
goto v_reusejp_1023_;
}
else
{
lean_object* v_reuseFailAlloc_1030_; 
v_reuseFailAlloc_1030_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1030_, 0, v___x_1022_);
lean_ctor_set(v_reuseFailAlloc_1030_, 1, v_tail_959_);
v___x_1024_ = v_reuseFailAlloc_1030_;
goto v_reusejp_1023_;
}
v_reusejp_1023_:
{
lean_object* v___x_1025_; lean_object* v___x_1027_; 
v___x_1025_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
if (v_isShared_957_ == 0)
{
lean_ctor_set(v___x_956_, 1, v___x_1024_);
lean_ctor_set(v___x_956_, 0, v___x_1025_);
v___x_1027_ = v___x_956_;
goto v_reusejp_1026_;
}
else
{
lean_object* v_reuseFailAlloc_1029_; 
v_reuseFailAlloc_1029_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1029_, 0, v___x_1025_);
lean_ctor_set(v_reuseFailAlloc_1029_, 1, v___x_1024_);
v___x_1027_ = v_reuseFailAlloc_1029_;
goto v_reusejp_1026_;
}
v_reusejp_1026_:
{
lean_object* v___x_1028_; 
v___x_1028_ = lean_apply_7(v_h__7_709_, v___x_1027_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1028_;
}
}
}
}
}
}
else
{
lean_object* v___x_1034_; lean_object* v___x_1036_; 
lean_dec(v_h__1_703_);
v___x_1034_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
if (v_isShared_957_ == 0)
{
lean_ctor_set(v___x_956_, 0, v___x_1034_);
v___x_1036_ = v___x_956_;
goto v_reusejp_1035_;
}
else
{
lean_object* v_reuseFailAlloc_1038_; 
v_reuseFailAlloc_1038_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1038_, 0, v___x_1034_);
lean_ctor_set(v_reuseFailAlloc_1038_, 1, v_tail_711_);
v___x_1036_ = v_reuseFailAlloc_1038_;
goto v_reusejp_1035_;
}
v_reusejp_1035_:
{
lean_object* v___x_1037_; 
v___x_1037_ = lean_apply_7(v_h__7_709_, v___x_1036_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1037_;
}
}
}
}
}
else
{
lean_object* v___x_1042_; 
lean_dec(v_h__6_708_);
lean_dec(v_h__5_707_);
lean_dec(v_h__4_706_);
lean_dec(v_h__3_705_);
lean_dec(v_h__2_704_);
lean_dec(v_h__1_703_);
v___x_1042_ = lean_apply_7(v_h__7_709_, v_input_702_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1042_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readValue_match__1_splitter(lean_object* v_motive_1043_, lean_object* v_input_1044_, lean_object* v_h__1_1045_, lean_object* v_h__2_1046_, lean_object* v_h__3_1047_, lean_object* v_h__4_1048_, lean_object* v_h__5_1049_, lean_object* v_h__6_1050_, lean_object* v_h__7_1051_){
_start:
{
if (lean_obj_tag(v_input_1044_) == 1)
{
lean_object* v_head_1052_; lean_object* v_tail_1053_; uint32_t v___x_1054_; uint32_t v___x_1055_; uint8_t v___x_1056_; 
v_head_1052_ = lean_ctor_get(v_input_1044_, 0);
v_tail_1053_ = lean_ctor_get(v_input_1044_, 1);
lean_inc(v_tail_1053_);
v___x_1054_ = 110;
v___x_1055_ = lean_unbox_uint32(v_head_1052_);
v___x_1056_ = lean_uint32_dec_eq(v___x_1055_, v___x_1054_);
if (v___x_1056_ == 0)
{
uint32_t v___x_1057_; uint32_t v___x_1058_; uint8_t v___x_1059_; 
lean_dec(v_h__1_1045_);
v___x_1057_ = 116;
v___x_1058_ = lean_unbox_uint32(v_head_1052_);
v___x_1059_ = lean_uint32_dec_eq(v___x_1058_, v___x_1057_);
if (v___x_1059_ == 0)
{
uint32_t v___x_1060_; uint32_t v___x_1061_; uint8_t v___x_1062_; 
lean_dec(v_h__2_1046_);
v___x_1060_ = 102;
v___x_1061_ = lean_unbox_uint32(v_head_1052_);
v___x_1062_ = lean_uint32_dec_eq(v___x_1061_, v___x_1060_);
if (v___x_1062_ == 0)
{
uint32_t v___x_1063_; uint32_t v___x_1064_; uint8_t v___x_1065_; 
lean_dec(v_h__3_1047_);
v___x_1063_ = 34;
v___x_1064_ = lean_unbox_uint32(v_head_1052_);
v___x_1065_ = lean_uint32_dec_eq(v___x_1064_, v___x_1063_);
if (v___x_1065_ == 0)
{
uint32_t v___x_1066_; uint32_t v___x_1067_; uint8_t v___x_1068_; 
lean_dec(v_h__4_1048_);
v___x_1066_ = 91;
v___x_1067_ = lean_unbox_uint32(v_head_1052_);
v___x_1068_ = lean_uint32_dec_eq(v___x_1067_, v___x_1066_);
if (v___x_1068_ == 0)
{
uint32_t v___x_1069_; uint32_t v___x_1070_; uint8_t v___x_1071_; 
lean_dec(v_h__5_1049_);
v___x_1069_ = 123;
v___x_1070_ = lean_unbox_uint32(v_head_1052_);
v___x_1071_ = lean_uint32_dec_eq(v___x_1070_, v___x_1069_);
if (v___x_1071_ == 0)
{
lean_object* v___x_1072_; 
lean_dec(v_tail_1053_);
lean_dec(v_h__6_1050_);
v___x_1072_ = lean_apply_7(v_h__7_1051_, v_input_1044_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1072_;
}
else
{
lean_object* v___x_1073_; 
lean_dec_ref_known(v_input_1044_, 2);
lean_dec(v_h__7_1051_);
v___x_1073_ = lean_apply_1(v_h__6_1050_, v_tail_1053_);
return v___x_1073_;
}
}
else
{
lean_object* v___x_1074_; 
lean_dec_ref_known(v_input_1044_, 2);
lean_dec(v_h__7_1051_);
lean_dec(v_h__6_1050_);
v___x_1074_ = lean_apply_1(v_h__5_1049_, v_tail_1053_);
return v___x_1074_;
}
}
else
{
lean_object* v___x_1075_; 
lean_dec_ref_known(v_input_1044_, 2);
lean_dec(v_h__7_1051_);
lean_dec(v_h__6_1050_);
lean_dec(v_h__5_1049_);
v___x_1075_ = lean_apply_1(v_h__4_1048_, v_tail_1053_);
return v___x_1075_;
}
}
else
{
lean_object* v___x_1077_; uint8_t v_isShared_1078_; uint8_t v_isSharedCheck_1206_; 
lean_dec(v_h__6_1050_);
lean_dec(v_h__5_1049_);
lean_dec(v_h__4_1048_);
v_isSharedCheck_1206_ = !lean_is_exclusive(v_input_1044_);
if (v_isSharedCheck_1206_ == 0)
{
lean_object* v_unused_1207_; lean_object* v_unused_1208_; 
v_unused_1207_ = lean_ctor_get(v_input_1044_, 1);
lean_dec(v_unused_1207_);
v_unused_1208_ = lean_ctor_get(v_input_1044_, 0);
lean_dec(v_unused_1208_);
v___x_1077_ = v_input_1044_;
v_isShared_1078_ = v_isSharedCheck_1206_;
goto v_resetjp_1076_;
}
else
{
lean_dec(v_input_1044_);
v___x_1077_ = lean_box(0);
v_isShared_1078_ = v_isSharedCheck_1206_;
goto v_resetjp_1076_;
}
v_resetjp_1076_:
{
if (lean_obj_tag(v_tail_1053_) == 1)
{
lean_object* v_head_1079_; lean_object* v_tail_1080_; uint32_t v___x_1081_; uint32_t v___x_1082_; uint8_t v___x_1083_; 
v_head_1079_ = lean_ctor_get(v_tail_1053_, 0);
v_tail_1080_ = lean_ctor_get(v_tail_1053_, 1);
lean_inc(v_tail_1080_);
v___x_1081_ = 97;
v___x_1082_ = lean_unbox_uint32(v_head_1079_);
v___x_1083_ = lean_uint32_dec_eq(v___x_1082_, v___x_1081_);
if (v___x_1083_ == 0)
{
lean_object* v___x_1084_; lean_object* v___x_1086_; 
lean_dec(v_tail_1080_);
lean_dec(v_h__3_1047_);
v___x_1084_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_1078_ == 0)
{
lean_ctor_set(v___x_1077_, 0, v___x_1084_);
v___x_1086_ = v___x_1077_;
goto v_reusejp_1085_;
}
else
{
lean_object* v_reuseFailAlloc_1088_; 
v_reuseFailAlloc_1088_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1088_, 0, v___x_1084_);
lean_ctor_set(v_reuseFailAlloc_1088_, 1, v_tail_1053_);
v___x_1086_ = v_reuseFailAlloc_1088_;
goto v_reusejp_1085_;
}
v_reusejp_1085_:
{
lean_object* v___x_1087_; 
v___x_1087_ = lean_apply_7(v_h__7_1051_, v___x_1086_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1087_;
}
}
else
{
lean_object* v___x_1090_; uint8_t v_isShared_1091_; uint8_t v_isSharedCheck_1198_; 
v_isSharedCheck_1198_ = !lean_is_exclusive(v_tail_1053_);
if (v_isSharedCheck_1198_ == 0)
{
lean_object* v_unused_1199_; lean_object* v_unused_1200_; 
v_unused_1199_ = lean_ctor_get(v_tail_1053_, 1);
lean_dec(v_unused_1199_);
v_unused_1200_ = lean_ctor_get(v_tail_1053_, 0);
lean_dec(v_unused_1200_);
v___x_1090_ = v_tail_1053_;
v_isShared_1091_ = v_isSharedCheck_1198_;
goto v_resetjp_1089_;
}
else
{
lean_dec(v_tail_1053_);
v___x_1090_ = lean_box(0);
v_isShared_1091_ = v_isSharedCheck_1198_;
goto v_resetjp_1089_;
}
v_resetjp_1089_:
{
if (lean_obj_tag(v_tail_1080_) == 1)
{
lean_object* v_head_1092_; lean_object* v_tail_1093_; uint32_t v___x_1094_; uint32_t v___x_1095_; uint8_t v___x_1096_; 
v_head_1092_ = lean_ctor_get(v_tail_1080_, 0);
v_tail_1093_ = lean_ctor_get(v_tail_1080_, 1);
lean_inc(v_tail_1093_);
v___x_1094_ = 108;
v___x_1095_ = lean_unbox_uint32(v_head_1092_);
v___x_1096_ = lean_uint32_dec_eq(v___x_1095_, v___x_1094_);
if (v___x_1096_ == 0)
{
lean_object* v___x_1097_; lean_object* v___x_1099_; 
lean_dec(v_tail_1093_);
lean_dec(v_h__3_1047_);
v___x_1097_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
if (v_isShared_1091_ == 0)
{
lean_ctor_set(v___x_1090_, 0, v___x_1097_);
v___x_1099_ = v___x_1090_;
goto v_reusejp_1098_;
}
else
{
lean_object* v_reuseFailAlloc_1105_; 
v_reuseFailAlloc_1105_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1105_, 0, v___x_1097_);
lean_ctor_set(v_reuseFailAlloc_1105_, 1, v_tail_1080_);
v___x_1099_ = v_reuseFailAlloc_1105_;
goto v_reusejp_1098_;
}
v_reusejp_1098_:
{
lean_object* v___x_1100_; lean_object* v___x_1102_; 
v___x_1100_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_1078_ == 0)
{
lean_ctor_set(v___x_1077_, 1, v___x_1099_);
lean_ctor_set(v___x_1077_, 0, v___x_1100_);
v___x_1102_ = v___x_1077_;
goto v_reusejp_1101_;
}
else
{
lean_object* v_reuseFailAlloc_1104_; 
v_reuseFailAlloc_1104_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1104_, 0, v___x_1100_);
lean_ctor_set(v_reuseFailAlloc_1104_, 1, v___x_1099_);
v___x_1102_ = v_reuseFailAlloc_1104_;
goto v_reusejp_1101_;
}
v_reusejp_1101_:
{
lean_object* v___x_1103_; 
v___x_1103_ = lean_apply_7(v_h__7_1051_, v___x_1102_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1103_;
}
}
}
else
{
lean_object* v___x_1107_; uint8_t v_isShared_1108_; uint8_t v_isSharedCheck_1186_; 
v_isSharedCheck_1186_ = !lean_is_exclusive(v_tail_1080_);
if (v_isSharedCheck_1186_ == 0)
{
lean_object* v_unused_1187_; lean_object* v_unused_1188_; 
v_unused_1187_ = lean_ctor_get(v_tail_1080_, 1);
lean_dec(v_unused_1187_);
v_unused_1188_ = lean_ctor_get(v_tail_1080_, 0);
lean_dec(v_unused_1188_);
v___x_1107_ = v_tail_1080_;
v_isShared_1108_ = v_isSharedCheck_1186_;
goto v_resetjp_1106_;
}
else
{
lean_dec(v_tail_1080_);
v___x_1107_ = lean_box(0);
v_isShared_1108_ = v_isSharedCheck_1186_;
goto v_resetjp_1106_;
}
v_resetjp_1106_:
{
if (lean_obj_tag(v_tail_1093_) == 1)
{
lean_object* v_head_1109_; lean_object* v_tail_1110_; uint32_t v___x_1111_; uint32_t v___x_1112_; uint8_t v___x_1113_; 
v_head_1109_ = lean_ctor_get(v_tail_1093_, 0);
v_tail_1110_ = lean_ctor_get(v_tail_1093_, 1);
v___x_1111_ = 115;
v___x_1112_ = lean_unbox_uint32(v_head_1109_);
v___x_1113_ = lean_uint32_dec_eq(v___x_1112_, v___x_1111_);
if (v___x_1113_ == 0)
{
lean_object* v___x_1114_; lean_object* v___x_1116_; 
lean_dec(v_h__3_1047_);
v___x_1114_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
if (v_isShared_1108_ == 0)
{
lean_ctor_set(v___x_1107_, 0, v___x_1114_);
v___x_1116_ = v___x_1107_;
goto v_reusejp_1115_;
}
else
{
lean_object* v_reuseFailAlloc_1126_; 
v_reuseFailAlloc_1126_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1126_, 0, v___x_1114_);
lean_ctor_set(v_reuseFailAlloc_1126_, 1, v_tail_1093_);
v___x_1116_ = v_reuseFailAlloc_1126_;
goto v_reusejp_1115_;
}
v_reusejp_1115_:
{
lean_object* v___x_1117_; lean_object* v___x_1119_; 
v___x_1117_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
if (v_isShared_1091_ == 0)
{
lean_ctor_set(v___x_1090_, 1, v___x_1116_);
lean_ctor_set(v___x_1090_, 0, v___x_1117_);
v___x_1119_ = v___x_1090_;
goto v_reusejp_1118_;
}
else
{
lean_object* v_reuseFailAlloc_1125_; 
v_reuseFailAlloc_1125_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1125_, 0, v___x_1117_);
lean_ctor_set(v_reuseFailAlloc_1125_, 1, v___x_1116_);
v___x_1119_ = v_reuseFailAlloc_1125_;
goto v_reusejp_1118_;
}
v_reusejp_1118_:
{
lean_object* v___x_1120_; lean_object* v___x_1122_; 
v___x_1120_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_1078_ == 0)
{
lean_ctor_set(v___x_1077_, 1, v___x_1119_);
lean_ctor_set(v___x_1077_, 0, v___x_1120_);
v___x_1122_ = v___x_1077_;
goto v_reusejp_1121_;
}
else
{
lean_object* v_reuseFailAlloc_1124_; 
v_reuseFailAlloc_1124_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1124_, 0, v___x_1120_);
lean_ctor_set(v_reuseFailAlloc_1124_, 1, v___x_1119_);
v___x_1122_ = v_reuseFailAlloc_1124_;
goto v_reusejp_1121_;
}
v_reusejp_1121_:
{
lean_object* v___x_1123_; 
v___x_1123_ = lean_apply_7(v_h__7_1051_, v___x_1122_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1123_;
}
}
}
}
else
{
lean_object* v___x_1128_; uint8_t v_isShared_1129_; uint8_t v_isSharedCheck_1170_; 
lean_inc(v_tail_1110_);
v_isSharedCheck_1170_ = !lean_is_exclusive(v_tail_1093_);
if (v_isSharedCheck_1170_ == 0)
{
lean_object* v_unused_1171_; lean_object* v_unused_1172_; 
v_unused_1171_ = lean_ctor_get(v_tail_1093_, 1);
lean_dec(v_unused_1171_);
v_unused_1172_ = lean_ctor_get(v_tail_1093_, 0);
lean_dec(v_unused_1172_);
v___x_1128_ = v_tail_1093_;
v_isShared_1129_ = v_isSharedCheck_1170_;
goto v_resetjp_1127_;
}
else
{
lean_dec(v_tail_1093_);
v___x_1128_ = lean_box(0);
v_isShared_1129_ = v_isSharedCheck_1170_;
goto v_resetjp_1127_;
}
v_resetjp_1127_:
{
if (lean_obj_tag(v_tail_1110_) == 1)
{
lean_object* v_head_1130_; lean_object* v_tail_1131_; uint32_t v___x_1132_; uint32_t v___x_1133_; uint8_t v___x_1134_; 
v_head_1130_ = lean_ctor_get(v_tail_1110_, 0);
v_tail_1131_ = lean_ctor_get(v_tail_1110_, 1);
v___x_1132_ = 101;
v___x_1133_ = lean_unbox_uint32(v_head_1130_);
v___x_1134_ = lean_uint32_dec_eq(v___x_1133_, v___x_1132_);
if (v___x_1134_ == 0)
{
lean_object* v___x_1135_; lean_object* v___x_1137_; 
lean_dec(v_h__3_1047_);
v___x_1135_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__5___boxed__const__1;
if (v_isShared_1129_ == 0)
{
lean_ctor_set(v___x_1128_, 0, v___x_1135_);
v___x_1137_ = v___x_1128_;
goto v_reusejp_1136_;
}
else
{
lean_object* v_reuseFailAlloc_1151_; 
v_reuseFailAlloc_1151_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1151_, 0, v___x_1135_);
lean_ctor_set(v_reuseFailAlloc_1151_, 1, v_tail_1110_);
v___x_1137_ = v_reuseFailAlloc_1151_;
goto v_reusejp_1136_;
}
v_reusejp_1136_:
{
lean_object* v___x_1138_; lean_object* v___x_1140_; 
v___x_1138_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
if (v_isShared_1108_ == 0)
{
lean_ctor_set(v___x_1107_, 1, v___x_1137_);
lean_ctor_set(v___x_1107_, 0, v___x_1138_);
v___x_1140_ = v___x_1107_;
goto v_reusejp_1139_;
}
else
{
lean_object* v_reuseFailAlloc_1150_; 
v_reuseFailAlloc_1150_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1150_, 0, v___x_1138_);
lean_ctor_set(v_reuseFailAlloc_1150_, 1, v___x_1137_);
v___x_1140_ = v_reuseFailAlloc_1150_;
goto v_reusejp_1139_;
}
v_reusejp_1139_:
{
lean_object* v___x_1141_; lean_object* v___x_1143_; 
v___x_1141_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
if (v_isShared_1091_ == 0)
{
lean_ctor_set(v___x_1090_, 1, v___x_1140_);
lean_ctor_set(v___x_1090_, 0, v___x_1141_);
v___x_1143_ = v___x_1090_;
goto v_reusejp_1142_;
}
else
{
lean_object* v_reuseFailAlloc_1149_; 
v_reuseFailAlloc_1149_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1149_, 0, v___x_1141_);
lean_ctor_set(v_reuseFailAlloc_1149_, 1, v___x_1140_);
v___x_1143_ = v_reuseFailAlloc_1149_;
goto v_reusejp_1142_;
}
v_reusejp_1142_:
{
lean_object* v___x_1144_; lean_object* v___x_1146_; 
v___x_1144_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_1078_ == 0)
{
lean_ctor_set(v___x_1077_, 1, v___x_1143_);
lean_ctor_set(v___x_1077_, 0, v___x_1144_);
v___x_1146_ = v___x_1077_;
goto v_reusejp_1145_;
}
else
{
lean_object* v_reuseFailAlloc_1148_; 
v_reuseFailAlloc_1148_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1148_, 0, v___x_1144_);
lean_ctor_set(v_reuseFailAlloc_1148_, 1, v___x_1143_);
v___x_1146_ = v_reuseFailAlloc_1148_;
goto v_reusejp_1145_;
}
v_reusejp_1145_:
{
lean_object* v___x_1147_; 
v___x_1147_ = lean_apply_7(v_h__7_1051_, v___x_1146_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1147_;
}
}
}
}
}
else
{
lean_object* v___x_1152_; 
lean_inc(v_tail_1131_);
lean_dec_ref_known(v_tail_1110_, 2);
lean_del_object(v___x_1128_);
lean_del_object(v___x_1107_);
lean_del_object(v___x_1090_);
lean_del_object(v___x_1077_);
lean_dec(v_h__7_1051_);
v___x_1152_ = lean_apply_1(v_h__3_1047_, v_tail_1131_);
return v___x_1152_;
}
}
else
{
lean_object* v___x_1153_; lean_object* v___x_1155_; 
lean_dec(v_h__3_1047_);
v___x_1153_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__5___boxed__const__1;
if (v_isShared_1129_ == 0)
{
lean_ctor_set(v___x_1128_, 0, v___x_1153_);
v___x_1155_ = v___x_1128_;
goto v_reusejp_1154_;
}
else
{
lean_object* v_reuseFailAlloc_1169_; 
v_reuseFailAlloc_1169_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1169_, 0, v___x_1153_);
lean_ctor_set(v_reuseFailAlloc_1169_, 1, v_tail_1110_);
v___x_1155_ = v_reuseFailAlloc_1169_;
goto v_reusejp_1154_;
}
v_reusejp_1154_:
{
lean_object* v___x_1156_; lean_object* v___x_1158_; 
v___x_1156_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
if (v_isShared_1108_ == 0)
{
lean_ctor_set(v___x_1107_, 1, v___x_1155_);
lean_ctor_set(v___x_1107_, 0, v___x_1156_);
v___x_1158_ = v___x_1107_;
goto v_reusejp_1157_;
}
else
{
lean_object* v_reuseFailAlloc_1168_; 
v_reuseFailAlloc_1168_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1168_, 0, v___x_1156_);
lean_ctor_set(v_reuseFailAlloc_1168_, 1, v___x_1155_);
v___x_1158_ = v_reuseFailAlloc_1168_;
goto v_reusejp_1157_;
}
v_reusejp_1157_:
{
lean_object* v___x_1159_; lean_object* v___x_1161_; 
v___x_1159_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
if (v_isShared_1091_ == 0)
{
lean_ctor_set(v___x_1090_, 1, v___x_1158_);
lean_ctor_set(v___x_1090_, 0, v___x_1159_);
v___x_1161_ = v___x_1090_;
goto v_reusejp_1160_;
}
else
{
lean_object* v_reuseFailAlloc_1167_; 
v_reuseFailAlloc_1167_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1167_, 0, v___x_1159_);
lean_ctor_set(v_reuseFailAlloc_1167_, 1, v___x_1158_);
v___x_1161_ = v_reuseFailAlloc_1167_;
goto v_reusejp_1160_;
}
v_reusejp_1160_:
{
lean_object* v___x_1162_; lean_object* v___x_1164_; 
v___x_1162_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_1078_ == 0)
{
lean_ctor_set(v___x_1077_, 1, v___x_1161_);
lean_ctor_set(v___x_1077_, 0, v___x_1162_);
v___x_1164_ = v___x_1077_;
goto v_reusejp_1163_;
}
else
{
lean_object* v_reuseFailAlloc_1166_; 
v_reuseFailAlloc_1166_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1166_, 0, v___x_1162_);
lean_ctor_set(v_reuseFailAlloc_1166_, 1, v___x_1161_);
v___x_1164_ = v_reuseFailAlloc_1166_;
goto v_reusejp_1163_;
}
v_reusejp_1163_:
{
lean_object* v___x_1165_; 
v___x_1165_ = lean_apply_7(v_h__7_1051_, v___x_1164_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1165_;
}
}
}
}
}
}
}
}
else
{
lean_object* v___x_1173_; lean_object* v___x_1175_; 
lean_dec(v_h__3_1047_);
v___x_1173_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
if (v_isShared_1108_ == 0)
{
lean_ctor_set(v___x_1107_, 0, v___x_1173_);
v___x_1175_ = v___x_1107_;
goto v_reusejp_1174_;
}
else
{
lean_object* v_reuseFailAlloc_1185_; 
v_reuseFailAlloc_1185_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1185_, 0, v___x_1173_);
lean_ctor_set(v_reuseFailAlloc_1185_, 1, v_tail_1093_);
v___x_1175_ = v_reuseFailAlloc_1185_;
goto v_reusejp_1174_;
}
v_reusejp_1174_:
{
lean_object* v___x_1176_; lean_object* v___x_1178_; 
v___x_1176_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
if (v_isShared_1091_ == 0)
{
lean_ctor_set(v___x_1090_, 1, v___x_1175_);
lean_ctor_set(v___x_1090_, 0, v___x_1176_);
v___x_1178_ = v___x_1090_;
goto v_reusejp_1177_;
}
else
{
lean_object* v_reuseFailAlloc_1184_; 
v_reuseFailAlloc_1184_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1184_, 0, v___x_1176_);
lean_ctor_set(v_reuseFailAlloc_1184_, 1, v___x_1175_);
v___x_1178_ = v_reuseFailAlloc_1184_;
goto v_reusejp_1177_;
}
v_reusejp_1177_:
{
lean_object* v___x_1179_; lean_object* v___x_1181_; 
v___x_1179_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_1078_ == 0)
{
lean_ctor_set(v___x_1077_, 1, v___x_1178_);
lean_ctor_set(v___x_1077_, 0, v___x_1179_);
v___x_1181_ = v___x_1077_;
goto v_reusejp_1180_;
}
else
{
lean_object* v_reuseFailAlloc_1183_; 
v_reuseFailAlloc_1183_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1183_, 0, v___x_1179_);
lean_ctor_set(v_reuseFailAlloc_1183_, 1, v___x_1178_);
v___x_1181_ = v_reuseFailAlloc_1183_;
goto v_reusejp_1180_;
}
v_reusejp_1180_:
{
lean_object* v___x_1182_; 
v___x_1182_ = lean_apply_7(v_h__7_1051_, v___x_1181_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1182_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_1189_; lean_object* v___x_1191_; 
lean_dec(v_h__3_1047_);
v___x_1189_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1;
if (v_isShared_1091_ == 0)
{
lean_ctor_set(v___x_1090_, 0, v___x_1189_);
v___x_1191_ = v___x_1090_;
goto v_reusejp_1190_;
}
else
{
lean_object* v_reuseFailAlloc_1197_; 
v_reuseFailAlloc_1197_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1197_, 0, v___x_1189_);
lean_ctor_set(v_reuseFailAlloc_1197_, 1, v_tail_1080_);
v___x_1191_ = v_reuseFailAlloc_1197_;
goto v_reusejp_1190_;
}
v_reusejp_1190_:
{
lean_object* v___x_1192_; lean_object* v___x_1194_; 
v___x_1192_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_1078_ == 0)
{
lean_ctor_set(v___x_1077_, 1, v___x_1191_);
lean_ctor_set(v___x_1077_, 0, v___x_1192_);
v___x_1194_ = v___x_1077_;
goto v_reusejp_1193_;
}
else
{
lean_object* v_reuseFailAlloc_1196_; 
v_reuseFailAlloc_1196_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1196_, 0, v___x_1192_);
lean_ctor_set(v_reuseFailAlloc_1196_, 1, v___x_1191_);
v___x_1194_ = v_reuseFailAlloc_1196_;
goto v_reusejp_1193_;
}
v_reusejp_1193_:
{
lean_object* v___x_1195_; 
v___x_1195_ = lean_apply_7(v_h__7_1051_, v___x_1194_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1195_;
}
}
}
}
}
}
else
{
lean_object* v___x_1201_; lean_object* v___x_1203_; 
lean_dec(v_h__3_1047_);
v___x_1201_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1;
if (v_isShared_1078_ == 0)
{
lean_ctor_set(v___x_1077_, 0, v___x_1201_);
v___x_1203_ = v___x_1077_;
goto v_reusejp_1202_;
}
else
{
lean_object* v_reuseFailAlloc_1205_; 
v_reuseFailAlloc_1205_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1205_, 0, v___x_1201_);
lean_ctor_set(v_reuseFailAlloc_1205_, 1, v_tail_1053_);
v___x_1203_ = v_reuseFailAlloc_1205_;
goto v_reusejp_1202_;
}
v_reusejp_1202_:
{
lean_object* v___x_1204_; 
v___x_1204_ = lean_apply_7(v_h__7_1051_, v___x_1203_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1204_;
}
}
}
}
}
else
{
lean_object* v___x_1210_; uint8_t v_isShared_1211_; uint8_t v_isSharedCheck_1294_; 
lean_dec(v_h__6_1050_);
lean_dec(v_h__5_1049_);
lean_dec(v_h__4_1048_);
lean_dec(v_h__3_1047_);
v_isSharedCheck_1294_ = !lean_is_exclusive(v_input_1044_);
if (v_isSharedCheck_1294_ == 0)
{
lean_object* v_unused_1295_; lean_object* v_unused_1296_; 
v_unused_1295_ = lean_ctor_get(v_input_1044_, 1);
lean_dec(v_unused_1295_);
v_unused_1296_ = lean_ctor_get(v_input_1044_, 0);
lean_dec(v_unused_1296_);
v___x_1210_ = v_input_1044_;
v_isShared_1211_ = v_isSharedCheck_1294_;
goto v_resetjp_1209_;
}
else
{
lean_dec(v_input_1044_);
v___x_1210_ = lean_box(0);
v_isShared_1211_ = v_isSharedCheck_1294_;
goto v_resetjp_1209_;
}
v_resetjp_1209_:
{
if (lean_obj_tag(v_tail_1053_) == 1)
{
lean_object* v_head_1212_; lean_object* v_tail_1213_; uint32_t v___x_1214_; uint32_t v___x_1215_; uint8_t v___x_1216_; 
v_head_1212_ = lean_ctor_get(v_tail_1053_, 0);
v_tail_1213_ = lean_ctor_get(v_tail_1053_, 1);
lean_inc(v_tail_1213_);
v___x_1214_ = 114;
v___x_1215_ = lean_unbox_uint32(v_head_1212_);
v___x_1216_ = lean_uint32_dec_eq(v___x_1215_, v___x_1214_);
if (v___x_1216_ == 0)
{
lean_object* v___x_1217_; lean_object* v___x_1219_; 
lean_dec(v_tail_1213_);
lean_dec(v_h__2_1046_);
v___x_1217_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
if (v_isShared_1211_ == 0)
{
lean_ctor_set(v___x_1210_, 0, v___x_1217_);
v___x_1219_ = v___x_1210_;
goto v_reusejp_1218_;
}
else
{
lean_object* v_reuseFailAlloc_1221_; 
v_reuseFailAlloc_1221_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1221_, 0, v___x_1217_);
lean_ctor_set(v_reuseFailAlloc_1221_, 1, v_tail_1053_);
v___x_1219_ = v_reuseFailAlloc_1221_;
goto v_reusejp_1218_;
}
v_reusejp_1218_:
{
lean_object* v___x_1220_; 
v___x_1220_ = lean_apply_7(v_h__7_1051_, v___x_1219_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1220_;
}
}
else
{
lean_object* v___x_1223_; uint8_t v_isShared_1224_; uint8_t v_isSharedCheck_1286_; 
v_isSharedCheck_1286_ = !lean_is_exclusive(v_tail_1053_);
if (v_isSharedCheck_1286_ == 0)
{
lean_object* v_unused_1287_; lean_object* v_unused_1288_; 
v_unused_1287_ = lean_ctor_get(v_tail_1053_, 1);
lean_dec(v_unused_1287_);
v_unused_1288_ = lean_ctor_get(v_tail_1053_, 0);
lean_dec(v_unused_1288_);
v___x_1223_ = v_tail_1053_;
v_isShared_1224_ = v_isSharedCheck_1286_;
goto v_resetjp_1222_;
}
else
{
lean_dec(v_tail_1053_);
v___x_1223_ = lean_box(0);
v_isShared_1224_ = v_isSharedCheck_1286_;
goto v_resetjp_1222_;
}
v_resetjp_1222_:
{
if (lean_obj_tag(v_tail_1213_) == 1)
{
lean_object* v_head_1225_; lean_object* v_tail_1226_; uint32_t v___x_1227_; uint32_t v___x_1228_; uint8_t v___x_1229_; 
v_head_1225_ = lean_ctor_get(v_tail_1213_, 0);
v_tail_1226_ = lean_ctor_get(v_tail_1213_, 1);
v___x_1227_ = 117;
v___x_1228_ = lean_unbox_uint32(v_head_1225_);
v___x_1229_ = lean_uint32_dec_eq(v___x_1228_, v___x_1227_);
if (v___x_1229_ == 0)
{
lean_object* v___x_1230_; lean_object* v___x_1232_; 
lean_dec(v_h__2_1046_);
v___x_1230_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1;
if (v_isShared_1224_ == 0)
{
lean_ctor_set(v___x_1223_, 0, v___x_1230_);
v___x_1232_ = v___x_1223_;
goto v_reusejp_1231_;
}
else
{
lean_object* v_reuseFailAlloc_1238_; 
v_reuseFailAlloc_1238_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1238_, 0, v___x_1230_);
lean_ctor_set(v_reuseFailAlloc_1238_, 1, v_tail_1213_);
v___x_1232_ = v_reuseFailAlloc_1238_;
goto v_reusejp_1231_;
}
v_reusejp_1231_:
{
lean_object* v___x_1233_; lean_object* v___x_1235_; 
v___x_1233_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
if (v_isShared_1211_ == 0)
{
lean_ctor_set(v___x_1210_, 1, v___x_1232_);
lean_ctor_set(v___x_1210_, 0, v___x_1233_);
v___x_1235_ = v___x_1210_;
goto v_reusejp_1234_;
}
else
{
lean_object* v_reuseFailAlloc_1237_; 
v_reuseFailAlloc_1237_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1237_, 0, v___x_1233_);
lean_ctor_set(v_reuseFailAlloc_1237_, 1, v___x_1232_);
v___x_1235_ = v_reuseFailAlloc_1237_;
goto v_reusejp_1234_;
}
v_reusejp_1234_:
{
lean_object* v___x_1236_; 
v___x_1236_ = lean_apply_7(v_h__7_1051_, v___x_1235_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1236_;
}
}
}
else
{
lean_object* v___x_1240_; uint8_t v_isShared_1241_; uint8_t v_isSharedCheck_1274_; 
lean_inc(v_tail_1226_);
v_isSharedCheck_1274_ = !lean_is_exclusive(v_tail_1213_);
if (v_isSharedCheck_1274_ == 0)
{
lean_object* v_unused_1275_; lean_object* v_unused_1276_; 
v_unused_1275_ = lean_ctor_get(v_tail_1213_, 1);
lean_dec(v_unused_1275_);
v_unused_1276_ = lean_ctor_get(v_tail_1213_, 0);
lean_dec(v_unused_1276_);
v___x_1240_ = v_tail_1213_;
v_isShared_1241_ = v_isSharedCheck_1274_;
goto v_resetjp_1239_;
}
else
{
lean_dec(v_tail_1213_);
v___x_1240_ = lean_box(0);
v_isShared_1241_ = v_isSharedCheck_1274_;
goto v_resetjp_1239_;
}
v_resetjp_1239_:
{
if (lean_obj_tag(v_tail_1226_) == 1)
{
lean_object* v_head_1242_; lean_object* v_tail_1243_; uint32_t v___x_1244_; uint32_t v___x_1245_; uint8_t v___x_1246_; 
v_head_1242_ = lean_ctor_get(v_tail_1226_, 0);
v_tail_1243_ = lean_ctor_get(v_tail_1226_, 1);
v___x_1244_ = 101;
v___x_1245_ = lean_unbox_uint32(v_head_1242_);
v___x_1246_ = lean_uint32_dec_eq(v___x_1245_, v___x_1244_);
if (v___x_1246_ == 0)
{
lean_object* v___x_1247_; lean_object* v___x_1249_; 
lean_dec(v_h__2_1046_);
v___x_1247_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
if (v_isShared_1241_ == 0)
{
lean_ctor_set(v___x_1240_, 0, v___x_1247_);
v___x_1249_ = v___x_1240_;
goto v_reusejp_1248_;
}
else
{
lean_object* v_reuseFailAlloc_1259_; 
v_reuseFailAlloc_1259_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1259_, 0, v___x_1247_);
lean_ctor_set(v_reuseFailAlloc_1259_, 1, v_tail_1226_);
v___x_1249_ = v_reuseFailAlloc_1259_;
goto v_reusejp_1248_;
}
v_reusejp_1248_:
{
lean_object* v___x_1250_; lean_object* v___x_1252_; 
v___x_1250_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1;
if (v_isShared_1224_ == 0)
{
lean_ctor_set(v___x_1223_, 1, v___x_1249_);
lean_ctor_set(v___x_1223_, 0, v___x_1250_);
v___x_1252_ = v___x_1223_;
goto v_reusejp_1251_;
}
else
{
lean_object* v_reuseFailAlloc_1258_; 
v_reuseFailAlloc_1258_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1258_, 0, v___x_1250_);
lean_ctor_set(v_reuseFailAlloc_1258_, 1, v___x_1249_);
v___x_1252_ = v_reuseFailAlloc_1258_;
goto v_reusejp_1251_;
}
v_reusejp_1251_:
{
lean_object* v___x_1253_; lean_object* v___x_1255_; 
v___x_1253_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
if (v_isShared_1211_ == 0)
{
lean_ctor_set(v___x_1210_, 1, v___x_1252_);
lean_ctor_set(v___x_1210_, 0, v___x_1253_);
v___x_1255_ = v___x_1210_;
goto v_reusejp_1254_;
}
else
{
lean_object* v_reuseFailAlloc_1257_; 
v_reuseFailAlloc_1257_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1257_, 0, v___x_1253_);
lean_ctor_set(v_reuseFailAlloc_1257_, 1, v___x_1252_);
v___x_1255_ = v_reuseFailAlloc_1257_;
goto v_reusejp_1254_;
}
v_reusejp_1254_:
{
lean_object* v___x_1256_; 
v___x_1256_ = lean_apply_7(v_h__7_1051_, v___x_1255_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1256_;
}
}
}
}
else
{
lean_object* v___x_1260_; 
lean_inc(v_tail_1243_);
lean_dec_ref_known(v_tail_1226_, 2);
lean_del_object(v___x_1240_);
lean_del_object(v___x_1223_);
lean_del_object(v___x_1210_);
lean_dec(v_h__7_1051_);
v___x_1260_ = lean_apply_1(v_h__2_1046_, v_tail_1243_);
return v___x_1260_;
}
}
else
{
lean_object* v___x_1261_; lean_object* v___x_1263_; 
lean_dec(v_h__2_1046_);
v___x_1261_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
if (v_isShared_1241_ == 0)
{
lean_ctor_set(v___x_1240_, 0, v___x_1261_);
v___x_1263_ = v___x_1240_;
goto v_reusejp_1262_;
}
else
{
lean_object* v_reuseFailAlloc_1273_; 
v_reuseFailAlloc_1273_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1273_, 0, v___x_1261_);
lean_ctor_set(v_reuseFailAlloc_1273_, 1, v_tail_1226_);
v___x_1263_ = v_reuseFailAlloc_1273_;
goto v_reusejp_1262_;
}
v_reusejp_1262_:
{
lean_object* v___x_1264_; lean_object* v___x_1266_; 
v___x_1264_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1;
if (v_isShared_1224_ == 0)
{
lean_ctor_set(v___x_1223_, 1, v___x_1263_);
lean_ctor_set(v___x_1223_, 0, v___x_1264_);
v___x_1266_ = v___x_1223_;
goto v_reusejp_1265_;
}
else
{
lean_object* v_reuseFailAlloc_1272_; 
v_reuseFailAlloc_1272_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1272_, 0, v___x_1264_);
lean_ctor_set(v_reuseFailAlloc_1272_, 1, v___x_1263_);
v___x_1266_ = v_reuseFailAlloc_1272_;
goto v_reusejp_1265_;
}
v_reusejp_1265_:
{
lean_object* v___x_1267_; lean_object* v___x_1269_; 
v___x_1267_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
if (v_isShared_1211_ == 0)
{
lean_ctor_set(v___x_1210_, 1, v___x_1266_);
lean_ctor_set(v___x_1210_, 0, v___x_1267_);
v___x_1269_ = v___x_1210_;
goto v_reusejp_1268_;
}
else
{
lean_object* v_reuseFailAlloc_1271_; 
v_reuseFailAlloc_1271_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1271_, 0, v___x_1267_);
lean_ctor_set(v_reuseFailAlloc_1271_, 1, v___x_1266_);
v___x_1269_ = v_reuseFailAlloc_1271_;
goto v_reusejp_1268_;
}
v_reusejp_1268_:
{
lean_object* v___x_1270_; 
v___x_1270_ = lean_apply_7(v_h__7_1051_, v___x_1269_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1270_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_1277_; lean_object* v___x_1279_; 
lean_dec(v_h__2_1046_);
v___x_1277_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1;
if (v_isShared_1224_ == 0)
{
lean_ctor_set(v___x_1223_, 0, v___x_1277_);
v___x_1279_ = v___x_1223_;
goto v_reusejp_1278_;
}
else
{
lean_object* v_reuseFailAlloc_1285_; 
v_reuseFailAlloc_1285_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1285_, 0, v___x_1277_);
lean_ctor_set(v_reuseFailAlloc_1285_, 1, v_tail_1213_);
v___x_1279_ = v_reuseFailAlloc_1285_;
goto v_reusejp_1278_;
}
v_reusejp_1278_:
{
lean_object* v___x_1280_; lean_object* v___x_1282_; 
v___x_1280_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
if (v_isShared_1211_ == 0)
{
lean_ctor_set(v___x_1210_, 1, v___x_1279_);
lean_ctor_set(v___x_1210_, 0, v___x_1280_);
v___x_1282_ = v___x_1210_;
goto v_reusejp_1281_;
}
else
{
lean_object* v_reuseFailAlloc_1284_; 
v_reuseFailAlloc_1284_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1284_, 0, v___x_1280_);
lean_ctor_set(v_reuseFailAlloc_1284_, 1, v___x_1279_);
v___x_1282_ = v_reuseFailAlloc_1284_;
goto v_reusejp_1281_;
}
v_reusejp_1281_:
{
lean_object* v___x_1283_; 
v___x_1283_ = lean_apply_7(v_h__7_1051_, v___x_1282_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1283_;
}
}
}
}
}
}
else
{
lean_object* v___x_1289_; lean_object* v___x_1291_; 
lean_dec(v_h__2_1046_);
v___x_1289_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1;
if (v_isShared_1211_ == 0)
{
lean_ctor_set(v___x_1210_, 0, v___x_1289_);
v___x_1291_ = v___x_1210_;
goto v_reusejp_1290_;
}
else
{
lean_object* v_reuseFailAlloc_1293_; 
v_reuseFailAlloc_1293_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1293_, 0, v___x_1289_);
lean_ctor_set(v_reuseFailAlloc_1293_, 1, v_tail_1053_);
v___x_1291_ = v_reuseFailAlloc_1293_;
goto v_reusejp_1290_;
}
v_reusejp_1290_:
{
lean_object* v___x_1292_; 
v___x_1292_ = lean_apply_7(v_h__7_1051_, v___x_1291_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1292_;
}
}
}
}
}
else
{
lean_object* v___x_1298_; uint8_t v_isShared_1299_; uint8_t v_isSharedCheck_1381_; 
lean_dec(v_h__6_1050_);
lean_dec(v_h__5_1049_);
lean_dec(v_h__4_1048_);
lean_dec(v_h__3_1047_);
lean_dec(v_h__2_1046_);
v_isSharedCheck_1381_ = !lean_is_exclusive(v_input_1044_);
if (v_isSharedCheck_1381_ == 0)
{
lean_object* v_unused_1382_; lean_object* v_unused_1383_; 
v_unused_1382_ = lean_ctor_get(v_input_1044_, 1);
lean_dec(v_unused_1382_);
v_unused_1383_ = lean_ctor_get(v_input_1044_, 0);
lean_dec(v_unused_1383_);
v___x_1298_ = v_input_1044_;
v_isShared_1299_ = v_isSharedCheck_1381_;
goto v_resetjp_1297_;
}
else
{
lean_dec(v_input_1044_);
v___x_1298_ = lean_box(0);
v_isShared_1299_ = v_isSharedCheck_1381_;
goto v_resetjp_1297_;
}
v_resetjp_1297_:
{
if (lean_obj_tag(v_tail_1053_) == 1)
{
lean_object* v_head_1300_; lean_object* v_tail_1301_; uint32_t v___x_1302_; uint32_t v___x_1303_; uint8_t v___x_1304_; 
v_head_1300_ = lean_ctor_get(v_tail_1053_, 0);
v_tail_1301_ = lean_ctor_get(v_tail_1053_, 1);
lean_inc(v_tail_1301_);
v___x_1302_ = 117;
v___x_1303_ = lean_unbox_uint32(v_head_1300_);
v___x_1304_ = lean_uint32_dec_eq(v___x_1303_, v___x_1302_);
if (v___x_1304_ == 0)
{
lean_object* v___x_1305_; lean_object* v___x_1307_; 
lean_dec(v_tail_1301_);
lean_dec(v_h__1_1045_);
v___x_1305_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
if (v_isShared_1299_ == 0)
{
lean_ctor_set(v___x_1298_, 0, v___x_1305_);
v___x_1307_ = v___x_1298_;
goto v_reusejp_1306_;
}
else
{
lean_object* v_reuseFailAlloc_1309_; 
v_reuseFailAlloc_1309_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1309_, 0, v___x_1305_);
lean_ctor_set(v_reuseFailAlloc_1309_, 1, v_tail_1053_);
v___x_1307_ = v_reuseFailAlloc_1309_;
goto v_reusejp_1306_;
}
v_reusejp_1306_:
{
lean_object* v___x_1308_; 
v___x_1308_ = lean_apply_7(v_h__7_1051_, v___x_1307_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1308_;
}
}
else
{
lean_object* v___x_1311_; uint8_t v_isShared_1312_; uint8_t v_isSharedCheck_1373_; 
v_isSharedCheck_1373_ = !lean_is_exclusive(v_tail_1053_);
if (v_isSharedCheck_1373_ == 0)
{
lean_object* v_unused_1374_; lean_object* v_unused_1375_; 
v_unused_1374_ = lean_ctor_get(v_tail_1053_, 1);
lean_dec(v_unused_1374_);
v_unused_1375_ = lean_ctor_get(v_tail_1053_, 0);
lean_dec(v_unused_1375_);
v___x_1311_ = v_tail_1053_;
v_isShared_1312_ = v_isSharedCheck_1373_;
goto v_resetjp_1310_;
}
else
{
lean_dec(v_tail_1053_);
v___x_1311_ = lean_box(0);
v_isShared_1312_ = v_isSharedCheck_1373_;
goto v_resetjp_1310_;
}
v_resetjp_1310_:
{
if (lean_obj_tag(v_tail_1301_) == 1)
{
lean_object* v_head_1313_; lean_object* v_tail_1314_; uint32_t v___x_1315_; uint32_t v___x_1316_; uint8_t v___x_1317_; 
v_head_1313_ = lean_ctor_get(v_tail_1301_, 0);
v_tail_1314_ = lean_ctor_get(v_tail_1301_, 1);
v___x_1315_ = 108;
v___x_1316_ = lean_unbox_uint32(v_head_1313_);
v___x_1317_ = lean_uint32_dec_eq(v___x_1316_, v___x_1315_);
if (v___x_1317_ == 0)
{
lean_object* v___x_1318_; lean_object* v___x_1320_; 
lean_dec(v_h__1_1045_);
v___x_1318_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
if (v_isShared_1312_ == 0)
{
lean_ctor_set(v___x_1311_, 0, v___x_1318_);
v___x_1320_ = v___x_1311_;
goto v_reusejp_1319_;
}
else
{
lean_object* v_reuseFailAlloc_1326_; 
v_reuseFailAlloc_1326_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1326_, 0, v___x_1318_);
lean_ctor_set(v_reuseFailAlloc_1326_, 1, v_tail_1301_);
v___x_1320_ = v_reuseFailAlloc_1326_;
goto v_reusejp_1319_;
}
v_reusejp_1319_:
{
lean_object* v___x_1321_; lean_object* v___x_1323_; 
v___x_1321_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
if (v_isShared_1299_ == 0)
{
lean_ctor_set(v___x_1298_, 1, v___x_1320_);
lean_ctor_set(v___x_1298_, 0, v___x_1321_);
v___x_1323_ = v___x_1298_;
goto v_reusejp_1322_;
}
else
{
lean_object* v_reuseFailAlloc_1325_; 
v_reuseFailAlloc_1325_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1325_, 0, v___x_1321_);
lean_ctor_set(v_reuseFailAlloc_1325_, 1, v___x_1320_);
v___x_1323_ = v_reuseFailAlloc_1325_;
goto v_reusejp_1322_;
}
v_reusejp_1322_:
{
lean_object* v___x_1324_; 
v___x_1324_ = lean_apply_7(v_h__7_1051_, v___x_1323_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1324_;
}
}
}
else
{
lean_object* v___x_1328_; uint8_t v_isShared_1329_; uint8_t v_isSharedCheck_1361_; 
lean_inc(v_tail_1314_);
v_isSharedCheck_1361_ = !lean_is_exclusive(v_tail_1301_);
if (v_isSharedCheck_1361_ == 0)
{
lean_object* v_unused_1362_; lean_object* v_unused_1363_; 
v_unused_1362_ = lean_ctor_get(v_tail_1301_, 1);
lean_dec(v_unused_1362_);
v_unused_1363_ = lean_ctor_get(v_tail_1301_, 0);
lean_dec(v_unused_1363_);
v___x_1328_ = v_tail_1301_;
v_isShared_1329_ = v_isSharedCheck_1361_;
goto v_resetjp_1327_;
}
else
{
lean_dec(v_tail_1301_);
v___x_1328_ = lean_box(0);
v_isShared_1329_ = v_isSharedCheck_1361_;
goto v_resetjp_1327_;
}
v_resetjp_1327_:
{
if (lean_obj_tag(v_tail_1314_) == 1)
{
lean_object* v_head_1330_; lean_object* v_tail_1331_; uint32_t v___x_1332_; uint8_t v___x_1333_; 
v_head_1330_ = lean_ctor_get(v_tail_1314_, 0);
v_tail_1331_ = lean_ctor_get(v_tail_1314_, 1);
v___x_1332_ = lean_unbox_uint32(v_head_1330_);
v___x_1333_ = lean_uint32_dec_eq(v___x_1332_, v___x_1315_);
if (v___x_1333_ == 0)
{
lean_object* v___x_1334_; lean_object* v___x_1336_; 
lean_dec(v_h__1_1045_);
v___x_1334_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
if (v_isShared_1329_ == 0)
{
lean_ctor_set(v___x_1328_, 0, v___x_1334_);
v___x_1336_ = v___x_1328_;
goto v_reusejp_1335_;
}
else
{
lean_object* v_reuseFailAlloc_1346_; 
v_reuseFailAlloc_1346_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1346_, 0, v___x_1334_);
lean_ctor_set(v_reuseFailAlloc_1346_, 1, v_tail_1314_);
v___x_1336_ = v_reuseFailAlloc_1346_;
goto v_reusejp_1335_;
}
v_reusejp_1335_:
{
lean_object* v___x_1337_; lean_object* v___x_1339_; 
v___x_1337_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
if (v_isShared_1312_ == 0)
{
lean_ctor_set(v___x_1311_, 1, v___x_1336_);
lean_ctor_set(v___x_1311_, 0, v___x_1337_);
v___x_1339_ = v___x_1311_;
goto v_reusejp_1338_;
}
else
{
lean_object* v_reuseFailAlloc_1345_; 
v_reuseFailAlloc_1345_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1345_, 0, v___x_1337_);
lean_ctor_set(v_reuseFailAlloc_1345_, 1, v___x_1336_);
v___x_1339_ = v_reuseFailAlloc_1345_;
goto v_reusejp_1338_;
}
v_reusejp_1338_:
{
lean_object* v___x_1340_; lean_object* v___x_1342_; 
v___x_1340_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
if (v_isShared_1299_ == 0)
{
lean_ctor_set(v___x_1298_, 1, v___x_1339_);
lean_ctor_set(v___x_1298_, 0, v___x_1340_);
v___x_1342_ = v___x_1298_;
goto v_reusejp_1341_;
}
else
{
lean_object* v_reuseFailAlloc_1344_; 
v_reuseFailAlloc_1344_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1344_, 0, v___x_1340_);
lean_ctor_set(v_reuseFailAlloc_1344_, 1, v___x_1339_);
v___x_1342_ = v_reuseFailAlloc_1344_;
goto v_reusejp_1341_;
}
v_reusejp_1341_:
{
lean_object* v___x_1343_; 
v___x_1343_ = lean_apply_7(v_h__7_1051_, v___x_1342_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1343_;
}
}
}
}
else
{
lean_object* v___x_1347_; 
lean_inc(v_tail_1331_);
lean_dec_ref_known(v_tail_1314_, 2);
lean_del_object(v___x_1328_);
lean_del_object(v___x_1311_);
lean_del_object(v___x_1298_);
lean_dec(v_h__7_1051_);
v___x_1347_ = lean_apply_1(v_h__1_1045_, v_tail_1331_);
return v___x_1347_;
}
}
else
{
lean_object* v___x_1348_; lean_object* v___x_1350_; 
lean_dec(v_h__1_1045_);
v___x_1348_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1;
if (v_isShared_1329_ == 0)
{
lean_ctor_set(v___x_1328_, 0, v___x_1348_);
v___x_1350_ = v___x_1328_;
goto v_reusejp_1349_;
}
else
{
lean_object* v_reuseFailAlloc_1360_; 
v_reuseFailAlloc_1360_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1360_, 0, v___x_1348_);
lean_ctor_set(v_reuseFailAlloc_1360_, 1, v_tail_1314_);
v___x_1350_ = v_reuseFailAlloc_1360_;
goto v_reusejp_1349_;
}
v_reusejp_1349_:
{
lean_object* v___x_1351_; lean_object* v___x_1353_; 
v___x_1351_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
if (v_isShared_1312_ == 0)
{
lean_ctor_set(v___x_1311_, 1, v___x_1350_);
lean_ctor_set(v___x_1311_, 0, v___x_1351_);
v___x_1353_ = v___x_1311_;
goto v_reusejp_1352_;
}
else
{
lean_object* v_reuseFailAlloc_1359_; 
v_reuseFailAlloc_1359_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1359_, 0, v___x_1351_);
lean_ctor_set(v_reuseFailAlloc_1359_, 1, v___x_1350_);
v___x_1353_ = v_reuseFailAlloc_1359_;
goto v_reusejp_1352_;
}
v_reusejp_1352_:
{
lean_object* v___x_1354_; lean_object* v___x_1356_; 
v___x_1354_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
if (v_isShared_1299_ == 0)
{
lean_ctor_set(v___x_1298_, 1, v___x_1353_);
lean_ctor_set(v___x_1298_, 0, v___x_1354_);
v___x_1356_ = v___x_1298_;
goto v_reusejp_1355_;
}
else
{
lean_object* v_reuseFailAlloc_1358_; 
v_reuseFailAlloc_1358_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1358_, 0, v___x_1354_);
lean_ctor_set(v_reuseFailAlloc_1358_, 1, v___x_1353_);
v___x_1356_ = v_reuseFailAlloc_1358_;
goto v_reusejp_1355_;
}
v_reusejp_1355_:
{
lean_object* v___x_1357_; 
v___x_1357_ = lean_apply_7(v_h__7_1051_, v___x_1356_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1357_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_1364_; lean_object* v___x_1366_; 
lean_dec(v_h__1_1045_);
v___x_1364_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1;
if (v_isShared_1312_ == 0)
{
lean_ctor_set(v___x_1311_, 0, v___x_1364_);
v___x_1366_ = v___x_1311_;
goto v_reusejp_1365_;
}
else
{
lean_object* v_reuseFailAlloc_1372_; 
v_reuseFailAlloc_1372_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1372_, 0, v___x_1364_);
lean_ctor_set(v_reuseFailAlloc_1372_, 1, v_tail_1301_);
v___x_1366_ = v_reuseFailAlloc_1372_;
goto v_reusejp_1365_;
}
v_reusejp_1365_:
{
lean_object* v___x_1367_; lean_object* v___x_1369_; 
v___x_1367_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
if (v_isShared_1299_ == 0)
{
lean_ctor_set(v___x_1298_, 1, v___x_1366_);
lean_ctor_set(v___x_1298_, 0, v___x_1367_);
v___x_1369_ = v___x_1298_;
goto v_reusejp_1368_;
}
else
{
lean_object* v_reuseFailAlloc_1371_; 
v_reuseFailAlloc_1371_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1371_, 0, v___x_1367_);
lean_ctor_set(v_reuseFailAlloc_1371_, 1, v___x_1366_);
v___x_1369_ = v_reuseFailAlloc_1371_;
goto v_reusejp_1368_;
}
v_reusejp_1368_:
{
lean_object* v___x_1370_; 
v___x_1370_ = lean_apply_7(v_h__7_1051_, v___x_1369_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1370_;
}
}
}
}
}
}
else
{
lean_object* v___x_1376_; lean_object* v___x_1378_; 
lean_dec(v_h__1_1045_);
v___x_1376_ = lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1;
if (v_isShared_1299_ == 0)
{
lean_ctor_set(v___x_1298_, 0, v___x_1376_);
v___x_1378_ = v___x_1298_;
goto v_reusejp_1377_;
}
else
{
lean_object* v_reuseFailAlloc_1380_; 
v_reuseFailAlloc_1380_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1380_, 0, v___x_1376_);
lean_ctor_set(v_reuseFailAlloc_1380_, 1, v_tail_1053_);
v___x_1378_ = v_reuseFailAlloc_1380_;
goto v_reusejp_1377_;
}
v_reusejp_1377_:
{
lean_object* v___x_1379_; 
v___x_1379_ = lean_apply_7(v_h__7_1051_, v___x_1378_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1379_;
}
}
}
}
}
else
{
lean_object* v___x_1384_; 
lean_dec(v_h__6_1050_);
lean_dec(v_h__5_1049_);
lean_dec(v_h__4_1048_);
lean_dec(v_h__3_1047_);
lean_dec(v_h__2_1046_);
lean_dec(v_h__1_1045_);
v___x_1384_ = lean_apply_7(v_h__7_1051_, v_input_1044_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_1384_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_AllItems_match__1_splitter___redArg(lean_object* v_x_1385_, lean_object* v_h__1_1386_, lean_object* v_h__2_1387_){
_start:
{
if (lean_obj_tag(v_x_1385_) == 0)
{
lean_object* v___x_1388_; lean_object* v___x_1389_; 
lean_dec(v_h__2_1387_);
v___x_1388_ = lean_box(0);
v___x_1389_ = lean_apply_1(v_h__1_1386_, v___x_1388_);
return v___x_1389_;
}
else
{
lean_object* v_value_1390_; lean_object* v_rest_1391_; lean_object* v___x_1392_; 
lean_dec(v_h__1_1386_);
v_value_1390_ = lean_ctor_get(v_x_1385_, 0);
lean_inc(v_value_1390_);
v_rest_1391_ = lean_ctor_get(v_x_1385_, 1);
lean_inc(v_rest_1391_);
lean_dec_ref_known(v_x_1385_, 2);
v___x_1392_ = lean_apply_2(v_h__2_1387_, v_value_1390_, v_rest_1391_);
return v___x_1392_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_AllItems_match__1_splitter(lean_object* v_motive_1393_, lean_object* v_x_1394_, lean_object* v_h__1_1395_, lean_object* v_h__2_1396_){
_start:
{
if (lean_obj_tag(v_x_1394_) == 0)
{
lean_object* v___x_1397_; lean_object* v___x_1398_; 
lean_dec(v_h__2_1396_);
v___x_1397_ = lean_box(0);
v___x_1398_ = lean_apply_1(v_h__1_1395_, v___x_1397_);
return v___x_1398_;
}
else
{
lean_object* v_value_1399_; lean_object* v_rest_1400_; lean_object* v___x_1401_; 
lean_dec(v_h__1_1395_);
v_value_1399_ = lean_ctor_get(v_x_1394_, 0);
lean_inc(v_value_1399_);
v_rest_1400_ = lean_ctor_get(v_x_1394_, 1);
lean_inc(v_rest_1400_);
lean_dec_ref_known(v_x_1394_, 2);
v___x_1401_ = lean_apply_2(v_h__2_1396_, v_value_1399_, v_rest_1400_);
return v___x_1401_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_renderItems_match__1_splitter___redArg(lean_object* v_x_1402_, lean_object* v_h__1_1403_, lean_object* v_h__2_1404_, lean_object* v_h__3_1405_){
_start:
{
if (lean_obj_tag(v_x_1402_) == 0)
{
lean_object* v___x_1406_; lean_object* v___x_1407_; 
lean_dec(v_h__3_1405_);
lean_dec(v_h__2_1404_);
v___x_1406_ = lean_box(0);
v___x_1407_ = lean_apply_1(v_h__1_1403_, v___x_1406_);
return v___x_1407_;
}
else
{
lean_object* v_rest_1408_; 
lean_dec(v_h__1_1403_);
v_rest_1408_ = lean_ctor_get(v_x_1402_, 1);
if (lean_obj_tag(v_rest_1408_) == 0)
{
lean_object* v_value_1409_; lean_object* v___x_1410_; 
lean_dec(v_h__3_1405_);
v_value_1409_ = lean_ctor_get(v_x_1402_, 0);
lean_inc(v_value_1409_);
lean_dec_ref_known(v_x_1402_, 2);
v___x_1410_ = lean_apply_1(v_h__2_1404_, v_value_1409_);
return v___x_1410_;
}
else
{
lean_object* v_value_1411_; lean_object* v___x_1412_; 
lean_inc(v_rest_1408_);
lean_dec(v_h__2_1404_);
v_value_1411_ = lean_ctor_get(v_x_1402_, 0);
lean_inc(v_value_1411_);
lean_dec_ref_known(v_x_1402_, 2);
v___x_1412_ = lean_apply_3(v_h__3_1405_, v_value_1411_, v_rest_1408_, lean_box(0));
return v___x_1412_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_renderItems_match__1_splitter(lean_object* v_motive_1413_, lean_object* v_x_1414_, lean_object* v_h__1_1415_, lean_object* v_h__2_1416_, lean_object* v_h__3_1417_){
_start:
{
if (lean_obj_tag(v_x_1414_) == 0)
{
lean_object* v___x_1418_; lean_object* v___x_1419_; 
lean_dec(v_h__3_1417_);
lean_dec(v_h__2_1416_);
v___x_1418_ = lean_box(0);
v___x_1419_ = lean_apply_1(v_h__1_1415_, v___x_1418_);
return v___x_1419_;
}
else
{
lean_object* v_rest_1420_; 
lean_dec(v_h__1_1415_);
v_rest_1420_ = lean_ctor_get(v_x_1414_, 1);
if (lean_obj_tag(v_rest_1420_) == 0)
{
lean_object* v_value_1421_; lean_object* v___x_1422_; 
lean_dec(v_h__3_1417_);
v_value_1421_ = lean_ctor_get(v_x_1414_, 0);
lean_inc(v_value_1421_);
lean_dec_ref_known(v_x_1414_, 2);
v___x_1422_ = lean_apply_1(v_h__2_1416_, v_value_1421_);
return v___x_1422_;
}
else
{
lean_object* v_value_1423_; lean_object* v___x_1424_; 
lean_inc(v_rest_1420_);
lean_dec(v_h__2_1416_);
v_value_1423_ = lean_ctor_get(v_x_1414_, 0);
lean_inc(v_value_1423_);
lean_dec_ref_known(v_x_1414_, 2);
v___x_1424_ = lean_apply_3(v_h__3_1417_, v_value_1423_, v_rest_1420_, lean_box(0));
return v___x_1424_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__7_splitter___redArg(lean_object* v_x_1425_, uint8_t v_x_1426_, lean_object* v_x_1427_, lean_object* v_h__1_1428_, lean_object* v_h__2_1429_){
_start:
{
lean_object* v_zero_1430_; uint8_t v_isZero_1431_; 
v_zero_1430_ = lean_unsigned_to_nat(0u);
v_isZero_1431_ = lean_nat_dec_eq(v_x_1425_, v_zero_1430_);
if (v_isZero_1431_ == 1)
{
lean_object* v___x_1432_; lean_object* v___x_1433_; 
lean_dec(v_h__2_1429_);
v___x_1432_ = lean_box(v_x_1426_);
v___x_1433_ = lean_apply_2(v_h__1_1428_, v___x_1432_, v_x_1427_);
return v___x_1433_;
}
else
{
lean_object* v_one_1434_; lean_object* v_n_1435_; lean_object* v___x_1436_; lean_object* v___x_1437_; 
lean_dec(v_h__1_1428_);
v_one_1434_ = lean_unsigned_to_nat(1u);
v_n_1435_ = lean_nat_sub(v_x_1425_, v_one_1434_);
v___x_1436_ = lean_box(v_x_1426_);
v___x_1437_ = lean_apply_3(v_h__2_1429_, v_n_1435_, v___x_1436_, v_x_1427_);
return v___x_1437_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__7_splitter___redArg___boxed(lean_object* v_x_1438_, lean_object* v_x_1439_, lean_object* v_x_1440_, lean_object* v_h__1_1441_, lean_object* v_h__2_1442_){
_start:
{
uint8_t v_x_27__boxed_1443_; lean_object* v_res_1444_; 
v_x_27__boxed_1443_ = lean_unbox(v_x_1439_);
v_res_1444_ = lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__7_splitter___redArg(v_x_1438_, v_x_27__boxed_1443_, v_x_1440_, v_h__1_1441_, v_h__2_1442_);
lean_dec(v_x_1438_);
return v_res_1444_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__7_splitter(lean_object* v_motive_1445_, lean_object* v_x_1446_, uint8_t v_x_1447_, lean_object* v_x_1448_, lean_object* v_h__1_1449_, lean_object* v_h__2_1450_){
_start:
{
lean_object* v_zero_1451_; uint8_t v_isZero_1452_; 
v_zero_1451_ = lean_unsigned_to_nat(0u);
v_isZero_1452_ = lean_nat_dec_eq(v_x_1446_, v_zero_1451_);
if (v_isZero_1452_ == 1)
{
lean_object* v___x_1453_; lean_object* v___x_1454_; 
lean_dec(v_h__2_1450_);
v___x_1453_ = lean_box(v_x_1447_);
v___x_1454_ = lean_apply_2(v_h__1_1449_, v___x_1453_, v_x_1448_);
return v___x_1454_;
}
else
{
lean_object* v_one_1455_; lean_object* v_n_1456_; lean_object* v___x_1457_; lean_object* v___x_1458_; 
lean_dec(v_h__1_1449_);
v_one_1455_ = lean_unsigned_to_nat(1u);
v_n_1456_ = lean_nat_sub(v_x_1446_, v_one_1455_);
v___x_1457_ = lean_box(v_x_1447_);
v___x_1458_ = lean_apply_3(v_h__2_1450_, v_n_1456_, v___x_1457_, v_x_1448_);
return v___x_1458_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__7_splitter___boxed(lean_object* v_motive_1459_, lean_object* v_x_1460_, lean_object* v_x_1461_, lean_object* v_x_1462_, lean_object* v_h__1_1463_, lean_object* v_h__2_1464_){
_start:
{
uint8_t v_x_46__boxed_1465_; lean_object* v_res_1466_; 
v_x_46__boxed_1465_ = lean_unbox(v_x_1461_);
v_res_1466_ = lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__7_splitter(v_motive_1459_, v_x_1460_, v_x_46__boxed_1465_, v_x_1462_, v_h__1_1463_, v_h__2_1464_);
lean_dec(v_x_1460_);
return v_res_1466_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__5_splitter___redArg(lean_object* v_x_1467_, lean_object* v_h__1_1468_){
_start:
{
lean_object* v_fst_1469_; lean_object* v_snd_1470_; lean_object* v___x_1471_; 
v_fst_1469_ = lean_ctor_get(v_x_1467_, 0);
lean_inc(v_fst_1469_);
v_snd_1470_ = lean_ctor_get(v_x_1467_, 1);
lean_inc(v_snd_1470_);
lean_dec_ref(v_x_1467_);
v___x_1471_ = lean_apply_2(v_h__1_1468_, v_fst_1469_, v_snd_1470_);
return v___x_1471_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__5_splitter(lean_object* v_motive_1472_, lean_object* v_x_1473_, lean_object* v_h__1_1474_){
_start:
{
lean_object* v_fst_1475_; lean_object* v_snd_1476_; lean_object* v___x_1477_; 
v_fst_1475_ = lean_ctor_get(v_x_1473_, 0);
lean_inc(v_fst_1475_);
v_snd_1476_ = lean_ctor_get(v_x_1473_, 1);
lean_inc(v_snd_1476_);
lean_dec_ref(v_x_1473_);
v___x_1477_ = lean_apply_2(v_h__1_1474_, v_fst_1475_, v_snd_1476_);
return v___x_1477_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__3_splitter___redArg(lean_object* v_rest_1478_, lean_object* v_h__1_1479_, lean_object* v_h__2_1480_, lean_object* v_h__3_1481_){
_start:
{
if (lean_obj_tag(v_rest_1478_) == 1)
{
lean_object* v_head_1482_; lean_object* v_tail_1483_; uint32_t v___x_1484_; uint32_t v___x_1485_; uint8_t v___x_1486_; 
v_head_1482_ = lean_ctor_get(v_rest_1478_, 0);
v_tail_1483_ = lean_ctor_get(v_rest_1478_, 1);
v___x_1484_ = 93;
v___x_1485_ = lean_unbox_uint32(v_head_1482_);
v___x_1486_ = lean_uint32_dec_eq(v___x_1485_, v___x_1484_);
if (v___x_1486_ == 0)
{
uint32_t v___x_1487_; uint32_t v___x_1488_; uint8_t v___x_1489_; 
lean_dec(v_h__1_1479_);
v___x_1487_ = 44;
v___x_1488_ = lean_unbox_uint32(v_head_1482_);
v___x_1489_ = lean_uint32_dec_eq(v___x_1488_, v___x_1487_);
if (v___x_1489_ == 0)
{
lean_object* v___x_1490_; 
lean_dec(v_h__2_1480_);
v___x_1490_ = lean_apply_3(v_h__3_1481_, v_rest_1478_, lean_box(0), lean_box(0));
return v___x_1490_;
}
else
{
lean_object* v___x_1491_; 
lean_inc(v_tail_1483_);
lean_dec_ref_known(v_rest_1478_, 2);
lean_dec(v_h__3_1481_);
v___x_1491_ = lean_apply_1(v_h__2_1480_, v_tail_1483_);
return v___x_1491_;
}
}
else
{
lean_object* v___x_1492_; 
lean_inc(v_tail_1483_);
lean_dec_ref_known(v_rest_1478_, 2);
lean_dec(v_h__3_1481_);
lean_dec(v_h__2_1480_);
v___x_1492_ = lean_apply_1(v_h__1_1479_, v_tail_1483_);
return v___x_1492_;
}
}
else
{
lean_object* v___x_1493_; 
lean_dec(v_h__2_1480_);
lean_dec(v_h__1_1479_);
v___x_1493_ = lean_apply_3(v_h__3_1481_, v_rest_1478_, lean_box(0), lean_box(0));
return v___x_1493_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__3_splitter(lean_object* v_motive_1494_, lean_object* v_rest_1495_, lean_object* v_h__1_1496_, lean_object* v_h__2_1497_, lean_object* v_h__3_1498_){
_start:
{
if (lean_obj_tag(v_rest_1495_) == 1)
{
lean_object* v_head_1499_; lean_object* v_tail_1500_; uint32_t v___x_1501_; uint32_t v___x_1502_; uint8_t v___x_1503_; 
v_head_1499_ = lean_ctor_get(v_rest_1495_, 0);
v_tail_1500_ = lean_ctor_get(v_rest_1495_, 1);
v___x_1501_ = 93;
v___x_1502_ = lean_unbox_uint32(v_head_1499_);
v___x_1503_ = lean_uint32_dec_eq(v___x_1502_, v___x_1501_);
if (v___x_1503_ == 0)
{
uint32_t v___x_1504_; uint32_t v___x_1505_; uint8_t v___x_1506_; 
lean_dec(v_h__1_1496_);
v___x_1504_ = 44;
v___x_1505_ = lean_unbox_uint32(v_head_1499_);
v___x_1506_ = lean_uint32_dec_eq(v___x_1505_, v___x_1504_);
if (v___x_1506_ == 0)
{
lean_object* v___x_1507_; 
lean_dec(v_h__2_1497_);
v___x_1507_ = lean_apply_3(v_h__3_1498_, v_rest_1495_, lean_box(0), lean_box(0));
return v___x_1507_;
}
else
{
lean_object* v___x_1508_; 
lean_inc(v_tail_1500_);
lean_dec_ref_known(v_rest_1495_, 2);
lean_dec(v_h__3_1498_);
v___x_1508_ = lean_apply_1(v_h__2_1497_, v_tail_1500_);
return v___x_1508_;
}
}
else
{
lean_object* v___x_1509_; 
lean_inc(v_tail_1500_);
lean_dec_ref_known(v_rest_1495_, 2);
lean_dec(v_h__3_1498_);
lean_dec(v_h__2_1497_);
v___x_1509_ = lean_apply_1(v_h__1_1496_, v_tail_1500_);
return v___x_1509_;
}
}
else
{
lean_object* v___x_1510_; 
lean_dec(v_h__2_1497_);
lean_dec(v_h__1_1496_);
v___x_1510_ = lean_apply_3(v_h__3_1498_, v_rest_1495_, lean_box(0), lean_box(0));
return v___x_1510_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__1_splitter___redArg(lean_object* v_x_1511_, lean_object* v_h__1_1512_){
_start:
{
lean_object* v_fst_1513_; lean_object* v_snd_1514_; lean_object* v___x_1515_; 
v_fst_1513_ = lean_ctor_get(v_x_1511_, 0);
lean_inc(v_fst_1513_);
v_snd_1514_ = lean_ctor_get(v_x_1511_, 1);
lean_inc(v_snd_1514_);
lean_dec_ref(v_x_1511_);
v___x_1515_ = lean_apply_2(v_h__1_1512_, v_fst_1513_, v_snd_1514_);
return v___x_1515_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readItems_match__1_splitter(lean_object* v_motive_1516_, lean_object* v_x_1517_, lean_object* v_h__1_1518_){
_start:
{
lean_object* v_fst_1519_; lean_object* v_snd_1520_; lean_object* v___x_1521_; 
v_fst_1519_ = lean_ctor_get(v_x_1517_, 0);
lean_inc(v_fst_1519_);
v_snd_1520_ = lean_ctor_get(v_x_1517_, 1);
lean_inc(v_snd_1520_);
lean_dec_ref(v_x_1517_);
v___x_1521_ = lean_apply_2(v_h__1_1518_, v_fst_1519_, v_snd_1520_);
return v___x_1521_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_Following_match__1_splitter___redArg(lean_object* v_x_1522_, lean_object* v_h__1_1523_, lean_object* v_h__2_1524_){
_start:
{
if (lean_obj_tag(v_x_1522_) == 0)
{
lean_object* v___x_1525_; lean_object* v___x_1526_; 
lean_dec(v_h__2_1524_);
v___x_1525_ = lean_box(0);
v___x_1526_ = lean_apply_1(v_h__1_1523_, v___x_1525_);
return v___x_1526_;
}
else
{
lean_object* v_head_1527_; lean_object* v_tail_1528_; lean_object* v___x_1529_; 
lean_dec(v_h__1_1523_);
v_head_1527_ = lean_ctor_get(v_x_1522_, 0);
lean_inc(v_head_1527_);
v_tail_1528_ = lean_ctor_get(v_x_1522_, 1);
lean_inc(v_tail_1528_);
lean_dec_ref_known(v_x_1522_, 2);
v___x_1529_ = lean_apply_2(v_h__2_1524_, v_head_1527_, v_tail_1528_);
return v___x_1529_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_Following_match__1_splitter(lean_object* v_motive_1530_, lean_object* v_x_1531_, lean_object* v_h__1_1532_, lean_object* v_h__2_1533_){
_start:
{
if (lean_obj_tag(v_x_1531_) == 0)
{
lean_object* v___x_1534_; lean_object* v___x_1535_; 
lean_dec(v_h__2_1533_);
v___x_1534_ = lean_box(0);
v___x_1535_ = lean_apply_1(v_h__1_1532_, v___x_1534_);
return v___x_1535_;
}
else
{
lean_object* v_head_1536_; lean_object* v_tail_1537_; lean_object* v___x_1538_; 
lean_dec(v_h__1_1532_);
v_head_1536_ = lean_ctor_get(v_x_1531_, 0);
lean_inc(v_head_1536_);
v_tail_1537_ = lean_ctor_get(v_x_1531_, 1);
lean_inc(v_tail_1537_);
lean_dec_ref_known(v_x_1531_, 2);
v___x_1538_ = lean_apply_2(v_h__2_1533_, v_head_1536_, v_tail_1537_);
return v___x_1538_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Option_bind_match__1_splitter___redArg(lean_object* v_x_1539_, lean_object* v_x_1540_, lean_object* v_h__1_1541_, lean_object* v_h__2_1542_){
_start:
{
if (lean_obj_tag(v_x_1539_) == 0)
{
lean_object* v___x_1543_; 
lean_dec(v_h__2_1542_);
v___x_1543_ = lean_apply_1(v_h__1_1541_, v_x_1540_);
return v___x_1543_;
}
else
{
lean_object* v_val_1544_; lean_object* v___x_1545_; 
lean_dec(v_h__1_1541_);
v_val_1544_ = lean_ctor_get(v_x_1539_, 0);
lean_inc(v_val_1544_);
lean_dec_ref_known(v_x_1539_, 1);
v___x_1545_ = lean_apply_2(v_h__2_1542_, v_val_1544_, v_x_1540_);
return v___x_1545_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Option_bind_match__1_splitter(lean_object* v_00_u03b1_1546_, lean_object* v_00_u03b2_1547_, lean_object* v_motive_1548_, lean_object* v_x_1549_, lean_object* v_x_1550_, lean_object* v_h__1_1551_, lean_object* v_h__2_1552_){
_start:
{
if (lean_obj_tag(v_x_1549_) == 0)
{
lean_object* v___x_1553_; 
lean_dec(v_h__2_1552_);
v___x_1553_ = lean_apply_1(v_h__1_1551_, v_x_1550_);
return v___x_1553_;
}
else
{
lean_object* v_val_1554_; lean_object* v___x_1555_; 
lean_dec(v_h__1_1551_);
v_val_1554_ = lean_ctor_get(v_x_1549_, 0);
lean_inc(v_val_1554_);
lean_dec_ref_known(v_x_1549_, 1);
v___x_1555_ = lean_apply_2(v_h__2_1552_, v_val_1554_, v_x_1550_);
return v___x_1555_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_AllFields_match__1_splitter___redArg(lean_object* v_x_1556_, lean_object* v_h__1_1557_, lean_object* v_h__2_1558_){
_start:
{
if (lean_obj_tag(v_x_1556_) == 0)
{
lean_object* v___x_1559_; lean_object* v___x_1560_; 
lean_dec(v_h__2_1558_);
v___x_1559_ = lean_box(0);
v___x_1560_ = lean_apply_1(v_h__1_1557_, v___x_1559_);
return v___x_1560_;
}
else
{
lean_object* v_key_1561_; lean_object* v_value_1562_; lean_object* v_rest_1563_; lean_object* v___x_1564_; 
lean_dec(v_h__1_1557_);
v_key_1561_ = lean_ctor_get(v_x_1556_, 0);
lean_inc_ref(v_key_1561_);
v_value_1562_ = lean_ctor_get(v_x_1556_, 1);
lean_inc(v_value_1562_);
v_rest_1563_ = lean_ctor_get(v_x_1556_, 2);
lean_inc(v_rest_1563_);
lean_dec_ref_known(v_x_1556_, 3);
v___x_1564_ = lean_apply_3(v_h__2_1558_, v_key_1561_, v_value_1562_, v_rest_1563_);
return v___x_1564_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_AllFields_match__1_splitter(lean_object* v_motive_1565_, lean_object* v_x_1566_, lean_object* v_h__1_1567_, lean_object* v_h__2_1568_){
_start:
{
if (lean_obj_tag(v_x_1566_) == 0)
{
lean_object* v___x_1569_; lean_object* v___x_1570_; 
lean_dec(v_h__2_1568_);
v___x_1569_ = lean_box(0);
v___x_1570_ = lean_apply_1(v_h__1_1567_, v___x_1569_);
return v___x_1570_;
}
else
{
lean_object* v_key_1571_; lean_object* v_value_1572_; lean_object* v_rest_1573_; lean_object* v___x_1574_; 
lean_dec(v_h__1_1567_);
v_key_1571_ = lean_ctor_get(v_x_1566_, 0);
lean_inc_ref(v_key_1571_);
v_value_1572_ = lean_ctor_get(v_x_1566_, 1);
lean_inc(v_value_1572_);
v_rest_1573_ = lean_ctor_get(v_x_1566_, 2);
lean_inc(v_rest_1573_);
lean_dec_ref_known(v_x_1566_, 3);
v___x_1574_ = lean_apply_3(v_h__2_1568_, v_key_1571_, v_value_1572_, v_rest_1573_);
return v___x_1574_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_renderFields_match__1_splitter___redArg(lean_object* v_x_1575_, lean_object* v_h__1_1576_, lean_object* v_h__2_1577_, lean_object* v_h__3_1578_){
_start:
{
if (lean_obj_tag(v_x_1575_) == 0)
{
lean_object* v___x_1579_; lean_object* v___x_1580_; 
lean_dec(v_h__3_1578_);
lean_dec(v_h__2_1577_);
v___x_1579_ = lean_box(0);
v___x_1580_ = lean_apply_1(v_h__1_1576_, v___x_1579_);
return v___x_1580_;
}
else
{
lean_object* v_rest_1581_; 
lean_dec(v_h__1_1576_);
v_rest_1581_ = lean_ctor_get(v_x_1575_, 2);
if (lean_obj_tag(v_rest_1581_) == 0)
{
lean_object* v_key_1582_; lean_object* v_value_1583_; lean_object* v___x_1584_; 
lean_dec(v_h__3_1578_);
v_key_1582_ = lean_ctor_get(v_x_1575_, 0);
lean_inc_ref(v_key_1582_);
v_value_1583_ = lean_ctor_get(v_x_1575_, 1);
lean_inc(v_value_1583_);
lean_dec_ref_known(v_x_1575_, 3);
v___x_1584_ = lean_apply_2(v_h__2_1577_, v_key_1582_, v_value_1583_);
return v___x_1584_;
}
else
{
lean_object* v_key_1585_; lean_object* v_value_1586_; lean_object* v___x_1587_; 
lean_inc(v_rest_1581_);
lean_dec(v_h__2_1577_);
v_key_1585_ = lean_ctor_get(v_x_1575_, 0);
lean_inc_ref(v_key_1585_);
v_value_1586_ = lean_ctor_get(v_x_1575_, 1);
lean_inc(v_value_1586_);
lean_dec_ref_known(v_x_1575_, 3);
v___x_1587_ = lean_apply_4(v_h__3_1578_, v_key_1585_, v_value_1586_, v_rest_1581_, lean_box(0));
return v___x_1587_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_renderFields_match__1_splitter(lean_object* v_motive_1588_, lean_object* v_x_1589_, lean_object* v_h__1_1590_, lean_object* v_h__2_1591_, lean_object* v_h__3_1592_){
_start:
{
if (lean_obj_tag(v_x_1589_) == 0)
{
lean_object* v___x_1593_; lean_object* v___x_1594_; 
lean_dec(v_h__3_1592_);
lean_dec(v_h__2_1591_);
v___x_1593_ = lean_box(0);
v___x_1594_ = lean_apply_1(v_h__1_1590_, v___x_1593_);
return v___x_1594_;
}
else
{
lean_object* v_rest_1595_; 
lean_dec(v_h__1_1590_);
v_rest_1595_ = lean_ctor_get(v_x_1589_, 2);
if (lean_obj_tag(v_rest_1595_) == 0)
{
lean_object* v_key_1596_; lean_object* v_value_1597_; lean_object* v___x_1598_; 
lean_dec(v_h__3_1592_);
v_key_1596_ = lean_ctor_get(v_x_1589_, 0);
lean_inc_ref(v_key_1596_);
v_value_1597_ = lean_ctor_get(v_x_1589_, 1);
lean_inc(v_value_1597_);
lean_dec_ref_known(v_x_1589_, 3);
v___x_1598_ = lean_apply_2(v_h__2_1591_, v_key_1596_, v_value_1597_);
return v___x_1598_;
}
else
{
lean_object* v_key_1599_; lean_object* v_value_1600_; lean_object* v___x_1601_; 
lean_inc(v_rest_1595_);
lean_dec(v_h__2_1591_);
v_key_1599_ = lean_ctor_get(v_x_1589_, 0);
lean_inc_ref(v_key_1599_);
v_value_1600_ = lean_ctor_get(v_x_1589_, 1);
lean_inc(v_value_1600_);
lean_dec_ref_known(v_x_1589_, 3);
v___x_1601_ = lean_apply_4(v_h__3_1592_, v_key_1599_, v_value_1600_, v_rest_1595_, lean_box(0));
return v___x_1601_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__7_splitter___redArg(lean_object* v_x_1602_, lean_object* v_h__1_1603_){
_start:
{
lean_object* v_fst_1604_; lean_object* v_snd_1605_; lean_object* v___x_1606_; 
v_fst_1604_ = lean_ctor_get(v_x_1602_, 0);
lean_inc(v_fst_1604_);
v_snd_1605_ = lean_ctor_get(v_x_1602_, 1);
lean_inc(v_snd_1605_);
lean_dec_ref(v_x_1602_);
v___x_1606_ = lean_apply_2(v_h__1_1603_, v_fst_1604_, v_snd_1605_);
return v___x_1606_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__7_splitter(lean_object* v_motive_1607_, lean_object* v_x_1608_, lean_object* v_h__1_1609_){
_start:
{
lean_object* v_fst_1610_; lean_object* v_snd_1611_; lean_object* v___x_1612_; 
v_fst_1610_ = lean_ctor_get(v_x_1608_, 0);
lean_inc(v_fst_1610_);
v_snd_1611_ = lean_ctor_get(v_x_1608_, 1);
lean_inc(v_snd_1611_);
lean_dec_ref(v_x_1608_);
v___x_1612_ = lean_apply_2(v_h__1_1609_, v_fst_1610_, v_snd_1611_);
return v___x_1612_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__5_splitter___redArg(lean_object* v_rest_1613_, lean_object* v_h__1_1614_, lean_object* v_h__2_1615_){
_start:
{
if (lean_obj_tag(v_rest_1613_) == 1)
{
lean_object* v_head_1616_; lean_object* v_tail_1617_; uint32_t v___x_1618_; uint32_t v___x_1619_; uint8_t v___x_1620_; 
v_head_1616_ = lean_ctor_get(v_rest_1613_, 0);
v_tail_1617_ = lean_ctor_get(v_rest_1613_, 1);
v___x_1618_ = 58;
v___x_1619_ = lean_unbox_uint32(v_head_1616_);
v___x_1620_ = lean_uint32_dec_eq(v___x_1619_, v___x_1618_);
if (v___x_1620_ == 0)
{
lean_object* v___x_1621_; 
lean_dec(v_h__1_1614_);
v___x_1621_ = lean_apply_2(v_h__2_1615_, v_rest_1613_, lean_box(0));
return v___x_1621_;
}
else
{
lean_object* v___x_1622_; 
lean_inc(v_tail_1617_);
lean_dec_ref_known(v_rest_1613_, 2);
lean_dec(v_h__2_1615_);
v___x_1622_ = lean_apply_1(v_h__1_1614_, v_tail_1617_);
return v___x_1622_;
}
}
else
{
lean_object* v___x_1623_; 
lean_dec(v_h__1_1614_);
v___x_1623_ = lean_apply_2(v_h__2_1615_, v_rest_1613_, lean_box(0));
return v___x_1623_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__5_splitter(lean_object* v_motive_1624_, lean_object* v_rest_1625_, lean_object* v_h__1_1626_, lean_object* v_h__2_1627_){
_start:
{
if (lean_obj_tag(v_rest_1625_) == 1)
{
lean_object* v_head_1628_; lean_object* v_tail_1629_; uint32_t v___x_1630_; uint32_t v___x_1631_; uint8_t v___x_1632_; 
v_head_1628_ = lean_ctor_get(v_rest_1625_, 0);
v_tail_1629_ = lean_ctor_get(v_rest_1625_, 1);
v___x_1630_ = 58;
v___x_1631_ = lean_unbox_uint32(v_head_1628_);
v___x_1632_ = lean_uint32_dec_eq(v___x_1631_, v___x_1630_);
if (v___x_1632_ == 0)
{
lean_object* v___x_1633_; 
lean_dec(v_h__1_1626_);
v___x_1633_ = lean_apply_2(v_h__2_1627_, v_rest_1625_, lean_box(0));
return v___x_1633_;
}
else
{
lean_object* v___x_1634_; 
lean_inc(v_tail_1629_);
lean_dec_ref_known(v_rest_1625_, 2);
lean_dec(v_h__2_1627_);
v___x_1634_ = lean_apply_1(v_h__1_1626_, v_tail_1629_);
return v___x_1634_;
}
}
else
{
lean_object* v___x_1635_; 
lean_dec(v_h__1_1626_);
v___x_1635_ = lean_apply_2(v_h__2_1627_, v_rest_1625_, lean_box(0));
return v___x_1635_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__3_splitter___redArg(lean_object* v_rest_1636_, lean_object* v_h__1_1637_, lean_object* v_h__2_1638_, lean_object* v_h__3_1639_){
_start:
{
if (lean_obj_tag(v_rest_1636_) == 1)
{
lean_object* v_head_1640_; lean_object* v_tail_1641_; uint32_t v___x_1642_; uint32_t v___x_1643_; uint8_t v___x_1644_; 
v_head_1640_ = lean_ctor_get(v_rest_1636_, 0);
v_tail_1641_ = lean_ctor_get(v_rest_1636_, 1);
v___x_1642_ = 125;
v___x_1643_ = lean_unbox_uint32(v_head_1640_);
v___x_1644_ = lean_uint32_dec_eq(v___x_1643_, v___x_1642_);
if (v___x_1644_ == 0)
{
uint32_t v___x_1645_; uint32_t v___x_1646_; uint8_t v___x_1647_; 
lean_dec(v_h__1_1637_);
v___x_1645_ = 44;
v___x_1646_ = lean_unbox_uint32(v_head_1640_);
v___x_1647_ = lean_uint32_dec_eq(v___x_1646_, v___x_1645_);
if (v___x_1647_ == 0)
{
lean_object* v___x_1648_; 
lean_dec(v_h__2_1638_);
v___x_1648_ = lean_apply_3(v_h__3_1639_, v_rest_1636_, lean_box(0), lean_box(0));
return v___x_1648_;
}
else
{
lean_object* v___x_1649_; 
lean_inc(v_tail_1641_);
lean_dec_ref_known(v_rest_1636_, 2);
lean_dec(v_h__3_1639_);
v___x_1649_ = lean_apply_1(v_h__2_1638_, v_tail_1641_);
return v___x_1649_;
}
}
else
{
lean_object* v___x_1650_; 
lean_inc(v_tail_1641_);
lean_dec_ref_known(v_rest_1636_, 2);
lean_dec(v_h__3_1639_);
lean_dec(v_h__2_1638_);
v___x_1650_ = lean_apply_1(v_h__1_1637_, v_tail_1641_);
return v___x_1650_;
}
}
else
{
lean_object* v___x_1651_; 
lean_dec(v_h__2_1638_);
lean_dec(v_h__1_1637_);
v___x_1651_ = lean_apply_3(v_h__3_1639_, v_rest_1636_, lean_box(0), lean_box(0));
return v___x_1651_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__3_splitter(lean_object* v_motive_1652_, lean_object* v_rest_1653_, lean_object* v_h__1_1654_, lean_object* v_h__2_1655_, lean_object* v_h__3_1656_){
_start:
{
if (lean_obj_tag(v_rest_1653_) == 1)
{
lean_object* v_head_1657_; lean_object* v_tail_1658_; uint32_t v___x_1659_; uint32_t v___x_1660_; uint8_t v___x_1661_; 
v_head_1657_ = lean_ctor_get(v_rest_1653_, 0);
v_tail_1658_ = lean_ctor_get(v_rest_1653_, 1);
v___x_1659_ = 125;
v___x_1660_ = lean_unbox_uint32(v_head_1657_);
v___x_1661_ = lean_uint32_dec_eq(v___x_1660_, v___x_1659_);
if (v___x_1661_ == 0)
{
uint32_t v___x_1662_; uint32_t v___x_1663_; uint8_t v___x_1664_; 
lean_dec(v_h__1_1654_);
v___x_1662_ = 44;
v___x_1663_ = lean_unbox_uint32(v_head_1657_);
v___x_1664_ = lean_uint32_dec_eq(v___x_1663_, v___x_1662_);
if (v___x_1664_ == 0)
{
lean_object* v___x_1665_; 
lean_dec(v_h__2_1655_);
v___x_1665_ = lean_apply_3(v_h__3_1656_, v_rest_1653_, lean_box(0), lean_box(0));
return v___x_1665_;
}
else
{
lean_object* v___x_1666_; 
lean_inc(v_tail_1658_);
lean_dec_ref_known(v_rest_1653_, 2);
lean_dec(v_h__3_1656_);
v___x_1666_ = lean_apply_1(v_h__2_1655_, v_tail_1658_);
return v___x_1666_;
}
}
else
{
lean_object* v___x_1667_; 
lean_inc(v_tail_1658_);
lean_dec_ref_known(v_rest_1653_, 2);
lean_dec(v_h__3_1656_);
lean_dec(v_h__2_1655_);
v___x_1667_ = lean_apply_1(v_h__1_1654_, v_tail_1658_);
return v___x_1667_;
}
}
else
{
lean_object* v___x_1668_; 
lean_dec(v_h__2_1655_);
lean_dec(v_h__1_1654_);
v___x_1668_ = lean_apply_3(v_h__3_1656_, v_rest_1653_, lean_box(0), lean_box(0));
return v___x_1668_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__1_splitter___redArg(lean_object* v_x_1669_, lean_object* v_h__1_1670_){
_start:
{
lean_object* v_fst_1671_; lean_object* v_snd_1672_; lean_object* v___x_1673_; 
v_fst_1671_ = lean_ctor_get(v_x_1669_, 0);
lean_inc(v_fst_1671_);
v_snd_1672_ = lean_ctor_get(v_x_1669_, 1);
lean_inc(v_snd_1672_);
lean_dec_ref(v_x_1669_);
v___x_1673_ = lean_apply_2(v_h__1_1670_, v_fst_1671_, v_snd_1672_);
return v___x_1673_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_readFields_match__1_splitter(lean_object* v_motive_1674_, lean_object* v_x_1675_, lean_object* v_h__1_1676_){
_start:
{
lean_object* v_fst_1677_; lean_object* v_snd_1678_; lean_object* v___x_1679_; 
v_fst_1677_ = lean_ctor_get(v_x_1675_, 0);
lean_inc(v_fst_1677_);
v_snd_1678_ = lean_ctor_get(v_x_1675_, 1);
lean_inc(v_snd_1678_);
lean_dec_ref(v_x_1675_);
v___x_1679_ = lean_apply_2(v_h__1_1676_, v_fst_1677_, v_snd_1678_);
return v___x_1679_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readWhole(lean_object* v_numbers_1680_, lean_object* v_input_1681_){
_start:
{
lean_object* v___x_1682_; lean_object* v___x_1683_; 
v___x_1682_ = l_List_lengthTR___redArg(v_input_1681_);
v___x_1683_ = lp_algalVerification_Algal_Core_JsonLayout_readValue(v_numbers_1680_, v___x_1682_, v_input_1681_);
lean_dec(v___x_1682_);
if (lean_obj_tag(v___x_1683_) == 0)
{
lean_object* v___x_1684_; 
v___x_1684_ = lean_box(0);
return v___x_1684_;
}
else
{
lean_object* v_val_1685_; lean_object* v___x_1687_; uint8_t v_isShared_1688_; uint8_t v_isSharedCheck_1696_; 
v_val_1685_ = lean_ctor_get(v___x_1683_, 0);
v_isSharedCheck_1696_ = !lean_is_exclusive(v___x_1683_);
if (v_isSharedCheck_1696_ == 0)
{
v___x_1687_ = v___x_1683_;
v_isShared_1688_ = v_isSharedCheck_1696_;
goto v_resetjp_1686_;
}
else
{
lean_inc(v_val_1685_);
lean_dec(v___x_1683_);
v___x_1687_ = lean_box(0);
v_isShared_1688_ = v_isSharedCheck_1696_;
goto v_resetjp_1686_;
}
v_resetjp_1686_:
{
lean_object* v_fst_1689_; lean_object* v_snd_1690_; uint8_t v___x_1691_; 
v_fst_1689_ = lean_ctor_get(v_val_1685_, 0);
lean_inc(v_fst_1689_);
v_snd_1690_ = lean_ctor_get(v_val_1685_, 1);
lean_inc(v_snd_1690_);
lean_dec(v_val_1685_);
v___x_1691_ = l_List_instDecidableEqNil___redArg(v_snd_1690_);
lean_dec(v_snd_1690_);
if (v___x_1691_ == 0)
{
lean_object* v___x_1692_; 
lean_dec(v_fst_1689_);
lean_del_object(v___x_1687_);
v___x_1692_ = lean_box(0);
return v___x_1692_;
}
else
{
lean_object* v___x_1694_; 
if (v_isShared_1688_ == 0)
{
lean_ctor_set(v___x_1687_, 0, v_fst_1689_);
v___x_1694_ = v___x_1687_;
goto v_reusejp_1693_;
}
else
{
lean_object* v_reuseFailAlloc_1695_; 
v_reuseFailAlloc_1695_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1695_, 0, v_fst_1689_);
v___x_1694_ = v_reuseFailAlloc_1695_;
goto v_reusejp_1693_;
}
v_reusejp_1693_:
{
return v___x_1694_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_renderBytes(lean_object* v_numbers_1697_, lean_object* v_value_1698_){
_start:
{
lean_object* v___x_1699_; lean_object* v___x_1700_; lean_object* v___x_1701_; 
v___x_1699_ = lp_algalVerification_Algal_Core_JsonLayout_render(v_numbers_1697_, v_value_1698_);
v___x_1700_ = lean_string_mk(v___x_1699_);
v___x_1701_ = lean_string_to_utf8(v___x_1700_);
lean_dec_ref(v___x_1700_);
return v___x_1701_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readBytes(lean_object* v_numbers_1702_, lean_object* v_bytes_1703_){
_start:
{
uint8_t v___x_1704_; 
v___x_1704_ = lean_string_validate_utf8(v_bytes_1703_);
if (v___x_1704_ == 0)
{
lean_object* v___x_1705_; 
lean_dec_ref(v_bytes_1703_);
lean_dec_ref(v_numbers_1702_);
v___x_1705_ = lean_box(0);
return v___x_1705_;
}
else
{
lean_object* v___x_1706_; lean_object* v___x_1707_; lean_object* v___x_1708_; 
v___x_1706_ = lean_string_from_utf8_unchecked(v_bytes_1703_);
v___x_1707_ = lean_string_data(v___x_1706_);
v___x_1708_ = lp_algalVerification_Algal_Core_JsonLayout_readWhole(v_numbers_1702_, v___x_1707_);
return v___x_1708_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_bytesToTokens(lean_object* v_numbers_1709_, lean_object* v_bytes_1710_){
_start:
{
lean_object* v___x_1711_; 
v___x_1711_ = lp_algalVerification_Algal_Core_JsonLayout_readBytes(v_numbers_1709_, v_bytes_1710_);
if (lean_obj_tag(v___x_1711_) == 0)
{
lean_object* v___x_1712_; 
v___x_1712_ = lean_box(0);
return v___x_1712_;
}
else
{
lean_object* v_val_1713_; lean_object* v___x_1715_; uint8_t v_isShared_1716_; uint8_t v_isSharedCheck_1721_; 
v_val_1713_ = lean_ctor_get(v___x_1711_, 0);
v_isSharedCheck_1721_ = !lean_is_exclusive(v___x_1711_);
if (v_isSharedCheck_1721_ == 0)
{
v___x_1715_ = v___x_1711_;
v_isShared_1716_ = v_isSharedCheck_1721_;
goto v_resetjp_1714_;
}
else
{
lean_inc(v_val_1713_);
lean_dec(v___x_1711_);
v___x_1715_ = lean_box(0);
v_isShared_1716_ = v_isSharedCheck_1721_;
goto v_resetjp_1714_;
}
v_resetjp_1714_:
{
lean_object* v___x_1717_; lean_object* v___x_1719_; 
v___x_1717_ = lp_algalVerification_Algal_Core_Json_encode(v_val_1713_);
if (v_isShared_1716_ == 0)
{
lean_ctor_set(v___x_1715_, 0, v___x_1717_);
v___x_1719_ = v___x_1715_;
goto v_reusejp_1718_;
}
else
{
lean_object* v_reuseFailAlloc_1720_; 
v_reuseFailAlloc_1720_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1720_, 0, v___x_1717_);
v___x_1719_ = v_reuseFailAlloc_1720_;
goto v_reusejp_1718_;
}
v_reusejp_1718_:
{
return v___x_1719_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___lam__0(uint64_t v_x_1722_){
_start:
{
lean_object* v___x_1723_; 
v___x_1723_ = lean_box(0);
return v___x_1723_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___lam__0___boxed(lean_object* v_x_1724_){
_start:
{
uint64_t v_x_12__boxed_1725_; lean_object* v_res_1726_; 
v_x_12__boxed_1725_ = lean_unbox_uint64(v_x_1724_);
lean_dec_ref(v_x_1724_);
v_res_1726_ = lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___lam__0(v_x_12__boxed_1725_);
return v_res_1726_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___lam__1(lean_object* v_x_1727_){
_start:
{
lean_object* v___x_1728_; 
v___x_1728_ = lean_box(0);
return v___x_1728_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___lam__1___boxed(lean_object* v_x_1729_){
_start:
{
lean_object* v_res_1730_; 
v_res_1730_ = lp_algalVerification_Algal_Core_JsonLayout_rejectNumbers___lam__1(v_x_1729_);
lean_dec(v_x_1729_);
return v_res_1730_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_AllNumbers_match__1_splitter___redArg(lean_object* v_x_1774_, lean_object* v_h__1_1775_, lean_object* v_h__2_1776_, lean_object* v_h__3_1777_, lean_object* v_h__4_1778_){
_start:
{
switch(lean_obj_tag(v_x_1774_))
{
case 2:
{
uint64_t v_value_1779_; lean_object* v___x_1780_; lean_object* v___x_1781_; 
lean_dec(v_h__4_1778_);
lean_dec(v_h__3_1777_);
lean_dec(v_h__2_1776_);
v_value_1779_ = lean_ctor_get_uint64(v_x_1774_, 0);
lean_dec_ref_known(v_x_1774_, 0);
v___x_1780_ = lean_box_uint64(v_value_1779_);
v___x_1781_ = lean_apply_1(v_h__1_1775_, v___x_1780_);
return v___x_1781_;
}
case 4:
{
lean_object* v_values_1782_; lean_object* v___x_1783_; 
lean_dec(v_h__4_1778_);
lean_dec(v_h__3_1777_);
lean_dec(v_h__1_1775_);
v_values_1782_ = lean_ctor_get(v_x_1774_, 0);
lean_inc(v_values_1782_);
lean_dec_ref_known(v_x_1774_, 1);
v___x_1783_ = lean_apply_1(v_h__2_1776_, v_values_1782_);
return v___x_1783_;
}
case 5:
{
lean_object* v_fields_1784_; lean_object* v___x_1785_; 
lean_dec(v_h__4_1778_);
lean_dec(v_h__2_1776_);
lean_dec(v_h__1_1775_);
v_fields_1784_ = lean_ctor_get(v_x_1774_, 0);
lean_inc(v_fields_1784_);
lean_dec_ref_known(v_x_1774_, 1);
v___x_1785_ = lean_apply_1(v_h__3_1777_, v_fields_1784_);
return v___x_1785_;
}
default: 
{
lean_object* v___x_1786_; 
lean_dec(v_h__3_1777_);
lean_dec(v_h__2_1776_);
lean_dec(v_h__1_1775_);
v___x_1786_ = lean_apply_4(v_h__4_1778_, v_x_1774_, lean_box(0), lean_box(0), lean_box(0));
return v___x_1786_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonLayout_0__Algal_Core_JsonLayout_AllNumbers_match__1_splitter(lean_object* v_motive_1787_, lean_object* v_x_1788_, lean_object* v_h__1_1789_, lean_object* v_h__2_1790_, lean_object* v_h__3_1791_, lean_object* v_h__4_1792_){
_start:
{
switch(lean_obj_tag(v_x_1788_))
{
case 2:
{
uint64_t v_value_1793_; lean_object* v___x_1794_; lean_object* v___x_1795_; 
lean_dec(v_h__4_1792_);
lean_dec(v_h__3_1791_);
lean_dec(v_h__2_1790_);
v_value_1793_ = lean_ctor_get_uint64(v_x_1788_, 0);
lean_dec_ref_known(v_x_1788_, 0);
v___x_1794_ = lean_box_uint64(v_value_1793_);
v___x_1795_ = lean_apply_1(v_h__1_1789_, v___x_1794_);
return v___x_1795_;
}
case 4:
{
lean_object* v_values_1796_; lean_object* v___x_1797_; 
lean_dec(v_h__4_1792_);
lean_dec(v_h__3_1791_);
lean_dec(v_h__1_1789_);
v_values_1796_ = lean_ctor_get(v_x_1788_, 0);
lean_inc(v_values_1796_);
lean_dec_ref_known(v_x_1788_, 1);
v___x_1797_ = lean_apply_1(v_h__2_1790_, v_values_1796_);
return v___x_1797_;
}
case 5:
{
lean_object* v_fields_1798_; lean_object* v___x_1799_; 
lean_dec(v_h__4_1792_);
lean_dec(v_h__2_1790_);
lean_dec(v_h__1_1789_);
v_fields_1798_ = lean_ctor_get(v_x_1788_, 0);
lean_inc(v_fields_1798_);
lean_dec_ref_known(v_x_1788_, 1);
v___x_1799_ = lean_apply_1(v_h__3_1791_, v_fields_1798_);
return v___x_1799_;
}
default: 
{
lean_object* v___x_1800_; 
lean_dec(v_h__3_1791_);
lean_dec(v_h__2_1790_);
lean_dec(v_h__1_1789_);
v___x_1800_ = lean_apply_4(v_h__4_1792_, v_x_1788_, lean_box(0), lean_box(0), lean_box(0));
return v___x_1800_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_canonicalBytes(lean_object* v_numbers_1801_, lean_object* v_value_1802_){
_start:
{
lean_object* v___x_1803_; lean_object* v___x_1804_; 
v___x_1803_ = lp_algalVerification_Algal_Core_Normalize_normalize(v_value_1802_);
v___x_1804_ = lp_algalVerification_Algal_Core_JsonLayout_renderBytes(v_numbers_1801_, v___x_1803_);
return v___x_1804_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonLayout_readCanonicalBytes(lean_object* v_numbers_1805_, lean_object* v_bytes_1806_){
_start:
{
lean_object* v___x_1807_; 
v___x_1807_ = lp_algalVerification_Algal_Core_JsonLayout_readBytes(v_numbers_1805_, v_bytes_1806_);
if (lean_obj_tag(v___x_1807_) == 0)
{
return v___x_1807_;
}
else
{
lean_object* v_val_1808_; lean_object* v___x_1810_; uint8_t v_isShared_1811_; uint8_t v_isSharedCheck_1816_; 
v_val_1808_ = lean_ctor_get(v___x_1807_, 0);
v_isSharedCheck_1816_ = !lean_is_exclusive(v___x_1807_);
if (v_isSharedCheck_1816_ == 0)
{
v___x_1810_ = v___x_1807_;
v_isShared_1811_ = v_isSharedCheck_1816_;
goto v_resetjp_1809_;
}
else
{
lean_inc(v_val_1808_);
lean_dec(v___x_1807_);
v___x_1810_ = lean_box(0);
v_isShared_1811_ = v_isSharedCheck_1816_;
goto v_resetjp_1809_;
}
v_resetjp_1809_:
{
lean_object* v___x_1812_; lean_object* v___x_1814_; 
v___x_1812_ = lp_algalVerification_Algal_Core_Normalize_normalize(v_val_1808_);
if (v_isShared_1811_ == 0)
{
lean_ctor_set(v___x_1810_, 0, v___x_1812_);
v___x_1814_ = v___x_1810_;
goto v_reusejp_1813_;
}
else
{
lean_object* v_reuseFailAlloc_1815_; 
v_reuseFailAlloc_1815_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1815_, 0, v___x_1812_);
v___x_1814_ = v_reuseFailAlloc_1815_;
goto v_reusejp_1813_;
}
v_reusejp_1813_:
{
return v___x_1814_;
}
}
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_JsonString(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Normalize(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_JsonLayout(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
lean_initialize_runtime_module();
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_JsonString(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Normalize(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Core_JsonLayout_renderItems___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_renderItems___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_renderItems___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___closed__0___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___closed__2___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___closed__3___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_render___closed__4___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__4___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___closed__4___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_render___closed__5___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__5___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___closed__5___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___closed__7___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___closed__8___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___closed__10___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___closed__11___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_render___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_render___closed__12___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__12___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___closed__12___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_renderFields___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_renderFields___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_renderFields___boxed__const__1);
lp_algalVerification_Algal_Core_JsonLayout_render___boxed__const__2 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___boxed__const__2();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___boxed__const__2);
lp_algalVerification_Algal_Core_JsonLayout_render___closed__13___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonLayout_render___closed__13___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonLayout_render___closed__13___boxed__const__1);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
