// Lean compiler output
// Module: Algal.Core.Oracle
// Imports: public import Init public meta import Init public import Algal.Core.Json
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
lean_object* l_instDecidableEqString___boxed(lean_object*, lean_object*);
uint8_t l_instDecidableEqList___redArg(lean_object*, lean_object*, lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
uint8_t lean_string_dec_eq(lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(lean_object*, lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_badInput_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_badInput_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_badInput_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_badInput_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_exhausted_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_exhausted_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_exhausted_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_exhausted_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_executorFailure_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_executorFailure_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_executorFailure_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_executorFailure_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_suspended_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_suspended_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_suspended_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_suspended_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_replayMismatch_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_replayMismatch_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_replayMismatch_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_replayMismatch_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_ErrorCode_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqErrorCode(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqErrorCode___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_success_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_success_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_failure_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_failure_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_suspended_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_suspended_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqReply_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqReply_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqReply(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqReply___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqRecord_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqRecord_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqRecord(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqRecord___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Core_Oracle_consume___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(4) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_consume___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_consume___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_consume(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_consume___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Oracle_0__Algal_Core_Oracle_consume_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Oracle_0__Algal_Core_Oracle_consume_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 12, .m_capacity = 12, .m_length = 11, .m_data = "executor.v1"};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "tool"};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 13, .m_capacity = 13, .m_length = 12, .m_data = "same request"};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__3_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 0, .m_other = 3, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__1_value),((lean_object*)&lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__3_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__4_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_Oracle_exampleRequest = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__4_value;
static const lean_string_object lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "root"};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = "a"};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__1_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__3_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__3_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__4_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_Oracle_firstOccurrence = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Oracle_secondOccurrence___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__3_value),((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_secondOccurrence___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_secondOccurrence___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_Oracle_secondOccurrence = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_secondOccurrence___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "first"};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 0, .m_other = 3, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstOccurrence___closed__4_value),((lean_object*)&lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__4_value),((lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__3_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_Oracle_firstRecord = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_firstRecord___closed__3_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Oracle_secondRecord___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 1}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(2, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_secondRecord___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_secondRecord___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Oracle_secondRecord___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 0, .m_other = 3, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Oracle_secondOccurrence___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Core_Oracle_exampleRequest___closed__4_value),((lean_object*)&lp_algalVerification_Algal_Core_Oracle_secondRecord___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Oracle_secondRecord___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_secondRecord___closed__1_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_Oracle_secondRecord = (const lean_object*)&lp_algalVerification_Algal_Core_Oracle_secondRecord___closed__1_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence_decEq(lean_object* v_x_1_, lean_object* v_x_2_){
_start:
{
lean_object* v_path_3_; lean_object* v_ordinal_4_; lean_object* v_path_5_; lean_object* v_ordinal_6_; lean_object* v___x_7_; uint8_t v___x_8_; 
v_path_3_ = lean_ctor_get(v_x_1_, 0);
lean_inc(v_path_3_);
v_ordinal_4_ = lean_ctor_get(v_x_1_, 1);
lean_inc(v_ordinal_4_);
lean_dec_ref(v_x_1_);
v_path_5_ = lean_ctor_get(v_x_2_, 0);
lean_inc(v_path_5_);
v_ordinal_6_ = lean_ctor_get(v_x_2_, 1);
lean_inc(v_ordinal_6_);
lean_dec_ref(v_x_2_);
v___x_7_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_8_ = l_instDecidableEqList___redArg(v___x_7_, v_path_3_, v_path_5_);
if (v___x_8_ == 0)
{
lean_dec(v_ordinal_6_);
lean_dec(v_ordinal_4_);
return v___x_8_;
}
else
{
uint8_t v___x_9_; 
v___x_9_ = lean_nat_dec_eq(v_ordinal_4_, v_ordinal_6_);
lean_dec(v_ordinal_6_);
lean_dec(v_ordinal_4_);
return v___x_9_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence_decEq___boxed(lean_object* v_x_10_, lean_object* v_x_11_){
_start:
{
uint8_t v_res_12_; lean_object* v_r_13_; 
v_res_12_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence_decEq(v_x_10_, v_x_11_);
v_r_13_ = lean_box(v_res_12_);
return v_r_13_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence(lean_object* v_x_14_, lean_object* v_x_15_){
_start:
{
uint8_t v___x_16_; 
v___x_16_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence_decEq(v_x_14_, v_x_15_);
return v___x_16_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence___boxed(lean_object* v_x_17_, lean_object* v_x_18_){
_start:
{
uint8_t v_res_19_; lean_object* v_r_20_; 
v_res_19_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence(v_x_17_, v_x_18_);
v_r_20_ = lean_box(v_res_19_);
return v_r_20_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest_decEq(lean_object* v_x_21_, lean_object* v_x_22_){
_start:
{
lean_object* v_executor_23_; lean_object* v_kind_24_; lean_object* v_input_25_; lean_object* v_executor_26_; lean_object* v_kind_27_; lean_object* v_input_28_; uint8_t v___x_29_; 
v_executor_23_ = lean_ctor_get(v_x_21_, 0);
v_kind_24_ = lean_ctor_get(v_x_21_, 1);
v_input_25_ = lean_ctor_get(v_x_21_, 2);
v_executor_26_ = lean_ctor_get(v_x_22_, 0);
v_kind_27_ = lean_ctor_get(v_x_22_, 1);
v_input_28_ = lean_ctor_get(v_x_22_, 2);
v___x_29_ = lean_string_dec_eq(v_executor_23_, v_executor_26_);
if (v___x_29_ == 0)
{
return v___x_29_;
}
else
{
uint8_t v___x_30_; 
v___x_30_ = lean_string_dec_eq(v_kind_24_, v_kind_27_);
if (v___x_30_ == 0)
{
return v___x_30_;
}
else
{
uint8_t v___x_31_; 
v___x_31_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_input_25_, v_input_28_);
return v___x_31_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest_decEq___boxed(lean_object* v_x_32_, lean_object* v_x_33_){
_start:
{
uint8_t v_res_34_; lean_object* v_r_35_; 
v_res_34_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest_decEq(v_x_32_, v_x_33_);
lean_dec_ref(v_x_33_);
lean_dec_ref(v_x_32_);
v_r_35_ = lean_box(v_res_34_);
return v_r_35_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest(lean_object* v_x_36_, lean_object* v_x_37_){
_start:
{
uint8_t v___x_38_; 
v___x_38_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest_decEq(v_x_36_, v_x_37_);
return v___x_38_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest___boxed(lean_object* v_x_39_, lean_object* v_x_40_){
_start:
{
uint8_t v_res_41_; lean_object* v_r_42_; 
v_res_41_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest(v_x_39_, v_x_40_);
lean_dec_ref(v_x_40_);
lean_dec_ref(v_x_39_);
v_r_42_ = lean_box(v_res_41_);
return v_r_42_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorIdx(uint8_t v_x_43_){
_start:
{
switch(v_x_43_)
{
case 0:
{
lean_object* v___x_44_; 
v___x_44_ = lean_unsigned_to_nat(0u);
return v___x_44_;
}
case 1:
{
lean_object* v___x_45_; 
v___x_45_ = lean_unsigned_to_nat(1u);
return v___x_45_;
}
case 2:
{
lean_object* v___x_46_; 
v___x_46_ = lean_unsigned_to_nat(2u);
return v___x_46_;
}
case 3:
{
lean_object* v___x_47_; 
v___x_47_ = lean_unsigned_to_nat(3u);
return v___x_47_;
}
default: 
{
lean_object* v___x_48_; 
v___x_48_ = lean_unsigned_to_nat(4u);
return v___x_48_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorIdx___boxed(lean_object* v_x_49_){
_start:
{
uint8_t v_x_boxed_50_; lean_object* v_res_51_; 
v_x_boxed_50_ = lean_unbox(v_x_49_);
v_res_51_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorIdx(v_x_boxed_50_);
return v_res_51_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorElim___redArg(lean_object* v_k_52_){
_start:
{
lean_inc(v_k_52_);
return v_k_52_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorElim___redArg___boxed(lean_object* v_k_53_){
_start:
{
lean_object* v_res_54_; 
v_res_54_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorElim___redArg(v_k_53_);
lean_dec(v_k_53_);
return v_res_54_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorElim(lean_object* v_motive_55_, lean_object* v_ctorIdx_56_, uint8_t v_t_57_, lean_object* v_h_58_, lean_object* v_k_59_){
_start:
{
lean_inc(v_k_59_);
return v_k_59_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorElim___boxed(lean_object* v_motive_60_, lean_object* v_ctorIdx_61_, lean_object* v_t_62_, lean_object* v_h_63_, lean_object* v_k_64_){
_start:
{
uint8_t v_t_boxed_65_; lean_object* v_res_66_; 
v_t_boxed_65_ = lean_unbox(v_t_62_);
v_res_66_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorElim(v_motive_60_, v_ctorIdx_61_, v_t_boxed_65_, v_h_63_, v_k_64_);
lean_dec(v_k_64_);
lean_dec(v_ctorIdx_61_);
return v_res_66_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_badInput_elim___redArg(lean_object* v_badInput_67_){
_start:
{
lean_inc(v_badInput_67_);
return v_badInput_67_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_badInput_elim___redArg___boxed(lean_object* v_badInput_68_){
_start:
{
lean_object* v_res_69_; 
v_res_69_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_badInput_elim___redArg(v_badInput_68_);
lean_dec(v_badInput_68_);
return v_res_69_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_badInput_elim(lean_object* v_motive_70_, uint8_t v_t_71_, lean_object* v_h_72_, lean_object* v_badInput_73_){
_start:
{
lean_inc(v_badInput_73_);
return v_badInput_73_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_badInput_elim___boxed(lean_object* v_motive_74_, lean_object* v_t_75_, lean_object* v_h_76_, lean_object* v_badInput_77_){
_start:
{
uint8_t v_t_boxed_78_; lean_object* v_res_79_; 
v_t_boxed_78_ = lean_unbox(v_t_75_);
v_res_79_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_badInput_elim(v_motive_74_, v_t_boxed_78_, v_h_76_, v_badInput_77_);
lean_dec(v_badInput_77_);
return v_res_79_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_exhausted_elim___redArg(lean_object* v_exhausted_80_){
_start:
{
lean_inc(v_exhausted_80_);
return v_exhausted_80_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_exhausted_elim___redArg___boxed(lean_object* v_exhausted_81_){
_start:
{
lean_object* v_res_82_; 
v_res_82_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_exhausted_elim___redArg(v_exhausted_81_);
lean_dec(v_exhausted_81_);
return v_res_82_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_exhausted_elim(lean_object* v_motive_83_, uint8_t v_t_84_, lean_object* v_h_85_, lean_object* v_exhausted_86_){
_start:
{
lean_inc(v_exhausted_86_);
return v_exhausted_86_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_exhausted_elim___boxed(lean_object* v_motive_87_, lean_object* v_t_88_, lean_object* v_h_89_, lean_object* v_exhausted_90_){
_start:
{
uint8_t v_t_boxed_91_; lean_object* v_res_92_; 
v_t_boxed_91_ = lean_unbox(v_t_88_);
v_res_92_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_exhausted_elim(v_motive_87_, v_t_boxed_91_, v_h_89_, v_exhausted_90_);
lean_dec(v_exhausted_90_);
return v_res_92_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_executorFailure_elim___redArg(lean_object* v_executorFailure_93_){
_start:
{
lean_inc(v_executorFailure_93_);
return v_executorFailure_93_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_executorFailure_elim___redArg___boxed(lean_object* v_executorFailure_94_){
_start:
{
lean_object* v_res_95_; 
v_res_95_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_executorFailure_elim___redArg(v_executorFailure_94_);
lean_dec(v_executorFailure_94_);
return v_res_95_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_executorFailure_elim(lean_object* v_motive_96_, uint8_t v_t_97_, lean_object* v_h_98_, lean_object* v_executorFailure_99_){
_start:
{
lean_inc(v_executorFailure_99_);
return v_executorFailure_99_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_executorFailure_elim___boxed(lean_object* v_motive_100_, lean_object* v_t_101_, lean_object* v_h_102_, lean_object* v_executorFailure_103_){
_start:
{
uint8_t v_t_boxed_104_; lean_object* v_res_105_; 
v_t_boxed_104_ = lean_unbox(v_t_101_);
v_res_105_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_executorFailure_elim(v_motive_100_, v_t_boxed_104_, v_h_102_, v_executorFailure_103_);
lean_dec(v_executorFailure_103_);
return v_res_105_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_suspended_elim___redArg(lean_object* v_suspended_106_){
_start:
{
lean_inc(v_suspended_106_);
return v_suspended_106_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_suspended_elim___redArg___boxed(lean_object* v_suspended_107_){
_start:
{
lean_object* v_res_108_; 
v_res_108_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_suspended_elim___redArg(v_suspended_107_);
lean_dec(v_suspended_107_);
return v_res_108_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_suspended_elim(lean_object* v_motive_109_, uint8_t v_t_110_, lean_object* v_h_111_, lean_object* v_suspended_112_){
_start:
{
lean_inc(v_suspended_112_);
return v_suspended_112_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_suspended_elim___boxed(lean_object* v_motive_113_, lean_object* v_t_114_, lean_object* v_h_115_, lean_object* v_suspended_116_){
_start:
{
uint8_t v_t_boxed_117_; lean_object* v_res_118_; 
v_t_boxed_117_ = lean_unbox(v_t_114_);
v_res_118_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_suspended_elim(v_motive_113_, v_t_boxed_117_, v_h_115_, v_suspended_116_);
lean_dec(v_suspended_116_);
return v_res_118_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_replayMismatch_elim___redArg(lean_object* v_replayMismatch_119_){
_start:
{
lean_inc(v_replayMismatch_119_);
return v_replayMismatch_119_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_replayMismatch_elim___redArg___boxed(lean_object* v_replayMismatch_120_){
_start:
{
lean_object* v_res_121_; 
v_res_121_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_replayMismatch_elim___redArg(v_replayMismatch_120_);
lean_dec(v_replayMismatch_120_);
return v_res_121_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_replayMismatch_elim(lean_object* v_motive_122_, uint8_t v_t_123_, lean_object* v_h_124_, lean_object* v_replayMismatch_125_){
_start:
{
lean_inc(v_replayMismatch_125_);
return v_replayMismatch_125_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_replayMismatch_elim___boxed(lean_object* v_motive_126_, lean_object* v_t_127_, lean_object* v_h_128_, lean_object* v_replayMismatch_129_){
_start:
{
uint8_t v_t_boxed_130_; lean_object* v_res_131_; 
v_t_boxed_130_ = lean_unbox(v_t_127_);
v_res_131_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_replayMismatch_elim(v_motive_126_, v_t_boxed_130_, v_h_128_, v_replayMismatch_129_);
lean_dec(v_replayMismatch_129_);
return v_res_131_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_ErrorCode_ofNat(lean_object* v_n_132_){
_start:
{
lean_object* v___x_133_; uint8_t v___x_134_; 
v___x_133_ = lean_unsigned_to_nat(1u);
v___x_134_ = lean_nat_dec_le(v_n_132_, v___x_133_);
if (v___x_134_ == 0)
{
lean_object* v___x_135_; uint8_t v___x_136_; 
v___x_135_ = lean_unsigned_to_nat(2u);
v___x_136_ = lean_nat_dec_le(v_n_132_, v___x_135_);
if (v___x_136_ == 0)
{
lean_object* v___x_137_; uint8_t v___x_138_; 
v___x_137_ = lean_unsigned_to_nat(3u);
v___x_138_ = lean_nat_dec_le(v_n_132_, v___x_137_);
if (v___x_138_ == 0)
{
uint8_t v___x_139_; 
v___x_139_ = 4;
return v___x_139_;
}
else
{
uint8_t v___x_140_; 
v___x_140_ = 3;
return v___x_140_;
}
}
else
{
uint8_t v___x_141_; 
v___x_141_ = 2;
return v___x_141_;
}
}
else
{
lean_object* v___x_142_; uint8_t v___x_143_; 
v___x_142_ = lean_unsigned_to_nat(0u);
v___x_143_ = lean_nat_dec_le(v_n_132_, v___x_142_);
if (v___x_143_ == 0)
{
uint8_t v___x_144_; 
v___x_144_ = 1;
return v___x_144_;
}
else
{
uint8_t v___x_145_; 
v___x_145_ = 0;
return v___x_145_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_ErrorCode_ofNat___boxed(lean_object* v_n_146_){
_start:
{
uint8_t v_res_147_; lean_object* v_r_148_; 
v_res_147_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_ofNat(v_n_146_);
lean_dec(v_n_146_);
v_r_148_ = lean_box(v_res_147_);
return v_r_148_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqErrorCode(uint8_t v_x_149_, uint8_t v_y_150_){
_start:
{
lean_object* v___x_151_; lean_object* v___x_152_; uint8_t v___x_153_; 
v___x_151_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorIdx(v_x_149_);
v___x_152_ = lp_algalVerification_Algal_Core_Oracle_ErrorCode_ctorIdx(v_y_150_);
v___x_153_ = lean_nat_dec_eq(v___x_151_, v___x_152_);
lean_dec(v___x_152_);
lean_dec(v___x_151_);
return v___x_153_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqErrorCode___boxed(lean_object* v_x_154_, lean_object* v_y_155_){
_start:
{
uint8_t v_x_13__boxed_156_; uint8_t v_y_14__boxed_157_; uint8_t v_res_158_; lean_object* v_r_159_; 
v_x_13__boxed_156_ = lean_unbox(v_x_154_);
v_y_14__boxed_157_ = lean_unbox(v_y_155_);
v_res_158_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqErrorCode(v_x_13__boxed_156_, v_y_14__boxed_157_);
v_r_159_ = lean_box(v_res_158_);
return v_r_159_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_ctorIdx(lean_object* v_x_160_){
_start:
{
switch(lean_obj_tag(v_x_160_))
{
case 0:
{
lean_object* v___x_161_; 
v___x_161_ = lean_unsigned_to_nat(0u);
return v___x_161_;
}
case 1:
{
lean_object* v___x_162_; 
v___x_162_ = lean_unsigned_to_nat(1u);
return v___x_162_;
}
default: 
{
lean_object* v___x_163_; 
v___x_163_ = lean_unsigned_to_nat(2u);
return v___x_163_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_ctorIdx___boxed(lean_object* v_x_164_){
_start:
{
lean_object* v_res_165_; 
v_res_165_ = lp_algalVerification_Algal_Core_Oracle_Reply_ctorIdx(v_x_164_);
lean_dec_ref(v_x_164_);
return v_res_165_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim___redArg(lean_object* v_t_166_, lean_object* v_k_167_){
_start:
{
if (lean_obj_tag(v_t_166_) == 1)
{
uint8_t v_code_168_; lean_object* v___x_169_; lean_object* v___x_170_; 
v_code_168_ = lean_ctor_get_uint8(v_t_166_, 0);
lean_dec_ref_known(v_t_166_, 0);
v___x_169_ = lean_box(v_code_168_);
v___x_170_ = lean_apply_1(v_k_167_, v___x_169_);
return v___x_170_;
}
else
{
lean_object* v_value_171_; lean_object* v___x_172_; 
v_value_171_ = lean_ctor_get(v_t_166_, 0);
lean_inc(v_value_171_);
lean_dec_ref(v_t_166_);
v___x_172_ = lean_apply_1(v_k_167_, v_value_171_);
return v___x_172_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim(lean_object* v_motive_173_, lean_object* v_ctorIdx_174_, lean_object* v_t_175_, lean_object* v_h_176_, lean_object* v_k_177_){
_start:
{
lean_object* v___x_178_; 
v___x_178_ = lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim___redArg(v_t_175_, v_k_177_);
return v___x_178_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim___boxed(lean_object* v_motive_179_, lean_object* v_ctorIdx_180_, lean_object* v_t_181_, lean_object* v_h_182_, lean_object* v_k_183_){
_start:
{
lean_object* v_res_184_; 
v_res_184_ = lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim(v_motive_179_, v_ctorIdx_180_, v_t_181_, v_h_182_, v_k_183_);
lean_dec(v_ctorIdx_180_);
return v_res_184_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_success_elim___redArg(lean_object* v_t_185_, lean_object* v_success_186_){
_start:
{
lean_object* v___x_187_; 
v___x_187_ = lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim___redArg(v_t_185_, v_success_186_);
return v___x_187_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_success_elim(lean_object* v_motive_188_, lean_object* v_t_189_, lean_object* v_h_190_, lean_object* v_success_191_){
_start:
{
lean_object* v___x_192_; 
v___x_192_ = lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim___redArg(v_t_189_, v_success_191_);
return v___x_192_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_failure_elim___redArg(lean_object* v_t_193_, lean_object* v_failure_194_){
_start:
{
lean_object* v___x_195_; 
v___x_195_ = lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim___redArg(v_t_193_, v_failure_194_);
return v___x_195_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_failure_elim(lean_object* v_motive_196_, lean_object* v_t_197_, lean_object* v_h_198_, lean_object* v_failure_199_){
_start:
{
lean_object* v___x_200_; 
v___x_200_ = lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim___redArg(v_t_197_, v_failure_199_);
return v___x_200_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_suspended_elim___redArg(lean_object* v_t_201_, lean_object* v_suspended_202_){
_start:
{
lean_object* v___x_203_; 
v___x_203_ = lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim___redArg(v_t_201_, v_suspended_202_);
return v___x_203_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_Reply_suspended_elim(lean_object* v_motive_204_, lean_object* v_t_205_, lean_object* v_h_206_, lean_object* v_suspended_207_){
_start:
{
lean_object* v___x_208_; 
v___x_208_ = lp_algalVerification_Algal_Core_Oracle_Reply_ctorElim___redArg(v_t_205_, v_suspended_207_);
return v___x_208_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqReply_decEq(lean_object* v_x_209_, lean_object* v_x_210_){
_start:
{
switch(lean_obj_tag(v_x_209_))
{
case 0:
{
if (lean_obj_tag(v_x_210_) == 0)
{
lean_object* v_value_211_; lean_object* v_value_212_; uint8_t v___x_213_; 
v_value_211_ = lean_ctor_get(v_x_209_, 0);
lean_inc(v_value_211_);
lean_dec_ref_known(v_x_209_, 1);
v_value_212_ = lean_ctor_get(v_x_210_, 0);
lean_inc(v_value_212_);
lean_dec_ref_known(v_x_210_, 1);
v___x_213_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_value_211_, v_value_212_);
lean_dec(v_value_212_);
lean_dec(v_value_211_);
return v___x_213_;
}
else
{
uint8_t v___x_214_; 
lean_dec_ref_known(v_x_209_, 1);
lean_dec_ref(v_x_210_);
v___x_214_ = 0;
return v___x_214_;
}
}
case 1:
{
if (lean_obj_tag(v_x_210_) == 1)
{
uint8_t v_code_215_; uint8_t v_code_216_; uint8_t v___x_217_; 
v_code_215_ = lean_ctor_get_uint8(v_x_209_, 0);
lean_dec_ref_known(v_x_209_, 0);
v_code_216_ = lean_ctor_get_uint8(v_x_210_, 0);
lean_dec_ref_known(v_x_210_, 0);
v___x_217_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqErrorCode(v_code_215_, v_code_216_);
return v___x_217_;
}
else
{
uint8_t v___x_218_; 
lean_dec_ref_known(v_x_209_, 0);
lean_dec_ref(v_x_210_);
v___x_218_ = 0;
return v___x_218_;
}
}
default: 
{
if (lean_obj_tag(v_x_210_) == 2)
{
lean_object* v_wakeHandles_219_; lean_object* v_wakeHandles_220_; lean_object* v___x_221_; uint8_t v___x_222_; 
v_wakeHandles_219_ = lean_ctor_get(v_x_209_, 0);
lean_inc(v_wakeHandles_219_);
lean_dec_ref_known(v_x_209_, 1);
v_wakeHandles_220_ = lean_ctor_get(v_x_210_, 0);
lean_inc(v_wakeHandles_220_);
lean_dec_ref_known(v_x_210_, 1);
v___x_221_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_222_ = l_instDecidableEqList___redArg(v___x_221_, v_wakeHandles_219_, v_wakeHandles_220_);
return v___x_222_;
}
else
{
uint8_t v___x_223_; 
lean_dec_ref_known(v_x_209_, 1);
lean_dec_ref(v_x_210_);
v___x_223_ = 0;
return v___x_223_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqReply_decEq___boxed(lean_object* v_x_224_, lean_object* v_x_225_){
_start:
{
uint8_t v_res_226_; lean_object* v_r_227_; 
v_res_226_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqReply_decEq(v_x_224_, v_x_225_);
v_r_227_ = lean_box(v_res_226_);
return v_r_227_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqReply(lean_object* v_x_228_, lean_object* v_x_229_){
_start:
{
uint8_t v___x_230_; 
v___x_230_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqReply_decEq(v_x_228_, v_x_229_);
return v___x_230_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqReply___boxed(lean_object* v_x_231_, lean_object* v_x_232_){
_start:
{
uint8_t v_res_233_; lean_object* v_r_234_; 
v_res_233_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqReply(v_x_231_, v_x_232_);
v_r_234_ = lean_box(v_res_233_);
return v_r_234_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqRecord_decEq(lean_object* v_x_235_, lean_object* v_x_236_){
_start:
{
lean_object* v_occurrence_237_; lean_object* v_request_238_; lean_object* v_reply_239_; lean_object* v_occurrence_240_; lean_object* v_request_241_; lean_object* v_reply_242_; uint8_t v___x_243_; 
v_occurrence_237_ = lean_ctor_get(v_x_235_, 0);
lean_inc_ref(v_occurrence_237_);
v_request_238_ = lean_ctor_get(v_x_235_, 1);
lean_inc_ref(v_request_238_);
v_reply_239_ = lean_ctor_get(v_x_235_, 2);
lean_inc_ref(v_reply_239_);
lean_dec_ref(v_x_235_);
v_occurrence_240_ = lean_ctor_get(v_x_236_, 0);
lean_inc_ref(v_occurrence_240_);
v_request_241_ = lean_ctor_get(v_x_236_, 1);
lean_inc_ref(v_request_241_);
v_reply_242_ = lean_ctor_get(v_x_236_, 2);
lean_inc_ref(v_reply_242_);
lean_dec_ref(v_x_236_);
v___x_243_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence_decEq(v_occurrence_237_, v_occurrence_240_);
if (v___x_243_ == 0)
{
lean_dec_ref(v_reply_242_);
lean_dec_ref(v_request_241_);
lean_dec_ref(v_reply_239_);
lean_dec_ref(v_request_238_);
return v___x_243_;
}
else
{
uint8_t v___x_244_; 
v___x_244_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest_decEq(v_request_238_, v_request_241_);
lean_dec_ref(v_request_241_);
lean_dec_ref(v_request_238_);
if (v___x_244_ == 0)
{
lean_dec_ref(v_reply_242_);
lean_dec_ref(v_reply_239_);
return v___x_244_;
}
else
{
uint8_t v___x_245_; 
v___x_245_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqReply_decEq(v_reply_239_, v_reply_242_);
return v___x_245_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqRecord_decEq___boxed(lean_object* v_x_246_, lean_object* v_x_247_){
_start:
{
uint8_t v_res_248_; lean_object* v_r_249_; 
v_res_248_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqRecord_decEq(v_x_246_, v_x_247_);
v_r_249_ = lean_box(v_res_248_);
return v_r_249_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Oracle_instDecidableEqRecord(lean_object* v_x_250_, lean_object* v_x_251_){
_start:
{
uint8_t v___x_252_; 
v___x_252_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqRecord_decEq(v_x_250_, v_x_251_);
return v___x_252_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_instDecidableEqRecord___boxed(lean_object* v_x_253_, lean_object* v_x_254_){
_start:
{
uint8_t v_res_255_; lean_object* v_r_256_; 
v_res_255_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqRecord(v_x_253_, v_x_254_);
v_r_256_ = lean_box(v_res_255_);
return v_r_256_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_consume(lean_object* v_tape_260_, lean_object* v_occurrence_261_, lean_object* v_request_262_){
_start:
{
if (lean_obj_tag(v_tape_260_) == 0)
{
lean_object* v___x_265_; 
lean_dec_ref(v_occurrence_261_);
v___x_265_ = ((lean_object*)(lp_algalVerification_Algal_Core_Oracle_consume___closed__0));
return v___x_265_;
}
else
{
lean_object* v_head_266_; lean_object* v_tail_267_; lean_object* v___x_269_; uint8_t v_isShared_270_; uint8_t v_isSharedCheck_280_; 
v_head_266_ = lean_ctor_get(v_tape_260_, 0);
v_tail_267_ = lean_ctor_get(v_tape_260_, 1);
v_isSharedCheck_280_ = !lean_is_exclusive(v_tape_260_);
if (v_isSharedCheck_280_ == 0)
{
v___x_269_ = v_tape_260_;
v_isShared_270_ = v_isSharedCheck_280_;
goto v_resetjp_268_;
}
else
{
lean_inc(v_tail_267_);
lean_inc(v_head_266_);
lean_dec(v_tape_260_);
v___x_269_ = lean_box(0);
v_isShared_270_ = v_isSharedCheck_280_;
goto v_resetjp_268_;
}
v_resetjp_268_:
{
lean_object* v_occurrence_271_; lean_object* v_request_272_; lean_object* v_reply_273_; uint8_t v___x_274_; 
v_occurrence_271_ = lean_ctor_get(v_head_266_, 0);
lean_inc_ref(v_occurrence_271_);
v_request_272_ = lean_ctor_get(v_head_266_, 1);
lean_inc_ref(v_request_272_);
v_reply_273_ = lean_ctor_get(v_head_266_, 2);
lean_inc_ref(v_reply_273_);
lean_dec(v_head_266_);
v___x_274_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqOccurrence_decEq(v_occurrence_271_, v_occurrence_261_);
if (v___x_274_ == 0)
{
lean_dec_ref(v_reply_273_);
lean_dec_ref(v_request_272_);
lean_del_object(v___x_269_);
lean_dec(v_tail_267_);
goto v___jp_263_;
}
else
{
uint8_t v___x_275_; 
v___x_275_ = lp_algalVerification_Algal_Core_Oracle_instDecidableEqRequest_decEq(v_request_272_, v_request_262_);
lean_dec_ref(v_request_272_);
if (v___x_275_ == 0)
{
lean_dec_ref(v_reply_273_);
lean_del_object(v___x_269_);
lean_dec(v_tail_267_);
goto v___jp_263_;
}
else
{
lean_object* v___x_277_; 
if (v_isShared_270_ == 0)
{
lean_ctor_set_tag(v___x_269_, 0);
lean_ctor_set(v___x_269_, 0, v_reply_273_);
v___x_277_ = v___x_269_;
goto v_reusejp_276_;
}
else
{
lean_object* v_reuseFailAlloc_279_; 
v_reuseFailAlloc_279_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_279_, 0, v_reply_273_);
lean_ctor_set(v_reuseFailAlloc_279_, 1, v_tail_267_);
v___x_277_ = v_reuseFailAlloc_279_;
goto v_reusejp_276_;
}
v_reusejp_276_:
{
lean_object* v___x_278_; 
v___x_278_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_278_, 0, v___x_277_);
return v___x_278_;
}
}
}
}
}
v___jp_263_:
{
lean_object* v___x_264_; 
v___x_264_ = ((lean_object*)(lp_algalVerification_Algal_Core_Oracle_consume___closed__0));
return v___x_264_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Oracle_consume___boxed(lean_object* v_tape_281_, lean_object* v_occurrence_282_, lean_object* v_request_283_){
_start:
{
lean_object* v_res_284_; 
v_res_284_ = lp_algalVerification_Algal_Core_Oracle_consume(v_tape_281_, v_occurrence_282_, v_request_283_);
lean_dec_ref(v_request_283_);
return v_res_284_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Oracle_0__Algal_Core_Oracle_consume_match__1_splitter___redArg(lean_object* v_tape_285_, lean_object* v_h__1_286_, lean_object* v_h__2_287_){
_start:
{
if (lean_obj_tag(v_tape_285_) == 0)
{
lean_object* v___x_288_; lean_object* v___x_289_; 
lean_dec(v_h__2_287_);
v___x_288_ = lean_box(0);
v___x_289_ = lean_apply_1(v_h__1_286_, v___x_288_);
return v___x_289_;
}
else
{
lean_object* v_head_290_; lean_object* v_tail_291_; lean_object* v___x_292_; 
lean_dec(v_h__1_286_);
v_head_290_ = lean_ctor_get(v_tape_285_, 0);
lean_inc(v_head_290_);
v_tail_291_ = lean_ctor_get(v_tape_285_, 1);
lean_inc(v_tail_291_);
lean_dec_ref_known(v_tape_285_, 2);
v___x_292_ = lean_apply_2(v_h__2_287_, v_head_290_, v_tail_291_);
return v___x_292_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Oracle_0__Algal_Core_Oracle_consume_match__1_splitter(lean_object* v_motive_293_, lean_object* v_tape_294_, lean_object* v_h__1_295_, lean_object* v_h__2_296_){
_start:
{
if (lean_obj_tag(v_tape_294_) == 0)
{
lean_object* v___x_297_; lean_object* v___x_298_; 
lean_dec(v_h__2_296_);
v___x_297_ = lean_box(0);
v___x_298_ = lean_apply_1(v_h__1_295_, v___x_297_);
return v___x_298_;
}
else
{
lean_object* v_head_299_; lean_object* v_tail_300_; lean_object* v___x_301_; 
lean_dec(v_h__1_295_);
v_head_299_ = lean_ctor_get(v_tape_294_, 0);
lean_inc(v_head_299_);
v_tail_300_ = lean_ctor_get(v_tape_294_, 1);
lean_inc(v_tail_300_);
lean_dec_ref_known(v_tape_294_, 2);
v___x_301_ = lean_apply_2(v_h__2_296_, v_head_299_, v_tail_300_);
return v___x_301_;
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Json(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_Oracle(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_Json(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
